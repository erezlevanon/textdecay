import time
import smtplib
from email.message import EmailMessage
import socket
import requests
from decouple import config

# --- Hardcoded Service URLs ---
NGROK_API_URL = "http://localhost:4040/api/tunnels"

# --- CONFIGURATION: Load sensitive data from the .env file ---
try:
    SENDER_EMAIL = config('SENDER_EMAIL')
    APP_PASSWORD = config('APP_PASSWORD')
    RECEIVER_EMAIL = config('RECEIVER_EMAIL')
    DUCKDNS_DOMAIN = config('DUCKDNS_DOMAIN')
    DUCKDNS_TOKEN = config('DUCKDNS_TOKEN')
    SSH_USER = config('SSH_USER', default='user') 

except Exception as e:
    print("Error loading environment variables. Ensure ddns_config.env exists and variables are set.")
    print(f"Details: {e}")
    exit()

def get_local_ip():
    """Tries to determine the local (LAN) IPv4 address for debugging."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

def resolve_hostname_to_ip(hostname):
    """
    Resolves a hostname (like 3.tcp.ngrok.io) to its IPv4 address.
    """
    try:
        # gethostbyname returns the IPv4 address
        ip_address = socket.gethostbyname(hostname)
        return ip_address, "SUCCESS"
    except socket.gaierror as e:
        return f"DNS Resolution Error for {hostname}: {e}", "ERROR"


def get_ngrok_tunnel_info():
    """Queries the local Ngrok API to get the current public SSH tunnel details."""
    MAX_RETRIES = 10
    RETRY_DELAY = 6 # seconds
    last_error_message = "Ngrok API unreachable (is Ngrok running?)"

    for attempt in range(MAX_RETRIES):
        try:
            response = requests.get(NGROK_API_URL, timeout=3)
            response.raise_for_status()
            data = response.json()
            
            for tunnel in data.get('tunnels', []):
                if tunnel.get('name') == 'ssh-access': 
                    public_url = tunnel['public_url']
                    ngrok_host_port = public_url.replace('tcp://', '')
                    ngrok_hostname = ngrok_host_port.split(':')[0]
                    
                    # Return the full host:port and the hostname
                    return ngrok_host_port, ngrok_hostname, "SUCCESS"
            
            last_error_message = f"Ngrok API reached, but tunnel 'ssh-access' not yet established."

        except requests.exceptions.RequestException as e:
            last_error_message = f"Ngrok API unreachable: {e}. Waiting for Ngrok to fully start."
        except Exception as e:
            last_error_message = f"Ngrok Info Error: {e}"
        
        if attempt < MAX_RETRIES - 1:
            print(f"Attempt {attempt + 1}/{MAX_RETRIES} failed. {last_error_message}. Retrying in {RETRY_DELAY}s...")
            time.sleep(RETRY_DELAY)

    # If the loop completes without success
    return last_error_message, "", "ERROR" 

def update_duckdns(ip_address):
    """
    Calls the DuckDNS API to update the domain's IP address with the resolved Ngrok IP.
    """
    # Use the 'ip=' parameter with the resolved IPv4 address.
    url = f"https://www.duckdns.org/update?verbose=true&domains={DUCKDNS_DOMAIN}&token={DUCKDNS_TOKEN}&ip={ip_address}"
    
    status_message = ""

    try:
        response = requests.get(url, timeout=10)
        response_text = response.text.strip()
        print(response_text)
        
        if response.status_code == 200:
            if response_text.startswith("OK"):
                status_message = f"SUCCESS: DuckDNS updated with Ngrok IP: {ip_address}"
            elif response_text.startswith("KO"):
                status_message = "FAILURE: DuckDNS update failed. Check token/domain in .env."
            elif response_text.startswith("ENOCHANGE"):
                status_message = "NO CHANGE: Ngrok IP was the same as the last update."
            else:
                status_message = f"WARNING: DuckDNS returned an unexpected status: {response_text}"
        else:
            status_message = f"FAILURE: HTTP error {response.status_code} during DuckDNS request."
            
    except requests.exceptions.RequestException as e:
        status_message = f"NETWORK ERROR: Failed to connect to DuckDNS. Details: {e}"
    except Exception as e:
        status_message = f"GENERAL ERROR during DuckDNS update: {e}"

    return status_message

def send_update_email(update_status, ngrok_host_port, ngrok_status, resolved_ip):
    """Connects to the Gmail SMTP server and sends the email containing the DDNS update result."""
    
    hostname = socket.gethostname()
    local_ip = get_local_ip()
    
    # 1. Build the email message
    msg = EmailMessage()
    
    # Determine overall subject status
    if ngrok_status == "SUCCESS":
        subject = f"✅ Pi Ready (Ngrok Active) for {DUCKDNS_DOMAIN} ({hostname})"
    else:
        subject = f"⚠️ Ngrok Tunnel Status: {ngrok_status} for {hostname}"
        
    msg['Subject'] = subject
    msg['From'] = SENDER_EMAIL
    msg['To'] = RECEIVER_EMAIL
    
    # Format Ngrok connection string
    if ngrok_status == "SUCCESS":
        ngrok_host, ngrok_port = ngrok_host_port.rsplit(':', 1)
        
        # The DuckDNS domain now points to this Ngrok Host's IP
        ngrok_cmd = f"ssh -p {ngrok_port} {SSH_USER}@{DUCKDNS_DOMAIN}"
        ngrok_details = (
            f"**✅ Ngrok Tunnel is Active**\n"
            f"Ngrok Host: {ngrok_host_port}\n"
            f"Resolved Ngrok IP: **{resolved_ip}**\n"
            f"Connect using the *permanent* domain command:\n"
            f"   {ngrok_cmd}"
        )
    else:
        ngrok_details = f"**❌ Ngrok Tunnel Status:** {ngrok_host_port}. \n(Please check if the `ngrok tcp 22` command is running on your Pi.)"


    body = (
        f"Hello from your Raspberry Pi ({hostname})!\n\n"
        f"--- Remote Access via Ngrok (Bypassing Router Firewall) ---\n\n"
        f"{ngrok_details}\n\n"
        f"--- DuckDNS Update Status ---\n"
        f"Status: {update_status}\n"
        f"Domain: {DUCKDNS_DOMAIN} (Updated with Resolved Ngrok IP)\n\n"
        f"--- Local Connection Fallback ---\n"
        f"If you are on the same Wi-Fi network, connect using:\n"
        f"   ssh {SSH_USER}@{local_ip}"
    )
    msg.set_content(body)

    # 2. Connect and send
    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls() 
        server.login(SENDER_EMAIL, APP_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"Successfully sent email with status: {update_status}, Ngrok: {ngrok_status}")
    except smtplib.SMTPAuthenticationError:
        print("SMTP Error: Authentication failed. Check SENDER_EMAIL and APP_PASSWORD in .env.")
    except Exception as e:
        print(f"SMTP Error: Failed to send email. Details: {e}")

# --- EXECUTE ---
if __name__ == '__main__':
    resolved_ip = "N/A" # Default value
    
    # 1. Get Ngrok info (host:port and just the hostname)
    ngrok_host_port, ngrok_hostname, ngrok_status = get_ngrok_tunnel_info()

    if ngrok_status == "SUCCESS":
        # 2. Resolve the Ngrok hostname to an IP address
        resolved_ip, resolve_status = resolve_hostname_to_ip(ngrok_hostname)

        if resolve_status == "SUCCESS":
            # 3. Update DuckDNS with the resolved IP
            status = update_duckdns(resolved_ip)
        else:
            # 4. Handle resolution failure
            status = f"DuckDNS NOT updated: IP resolution failed for {ngrok_hostname}. Error: {resolved_ip}"
            ngrok_status = "DNS_FAIL" # Change status to reflect the core issue
    else:
        # 5. Handle Ngrok connection failure
        status = f"DuckDNS NOT updated because Ngrok tunnel was in {ngrok_status} status."
        
    # 6. Send an email with the final status
    send_update_email(status, ngrok_host_port, ngrok_status, resolved_ip)
