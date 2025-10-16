import time
import smtplib
from email.message import EmailMessage
import socket
import requests
from decouple import config

# --- Hardcoded IP Check Service ---
IPV6_CHECK_URL = "https://ipv6.icanhazip.com"
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
        # Doesn't actually connect, just sends a packet to a known external address
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

def get_current_public_ipv6():
    """Fetches the public IPv6 address using the hardcoded icanhazip service."""
    try:
        # Use IPv6 socket to enforce IPv6 request
        response = requests.get(IPV6_CHECK_URL, timeout=5)
        response.raise_for_status() 
        return response.text.strip()
            
    except requests.exceptions.RequestException as e:
        return f"IPv6 Fetch Error: {e}"

def get_ngrok_tunnel_info():
    """Queries the local Ngrok API to get the current public SSH tunnel details."""
    MAX_RETRIES = 10
    RETRY_DELAY = 6  # seconds
    last_error_message = "Ngrok API unreachable (is Ngrok running?)"

    for attempt in range(MAX_RETRIES):
        try:
            response = requests.get(NGROK_API_URL, timeout=3)
            response.raise_for_status()
            data = response.json()
            
            # Look for a TCP tunnel defined in ngrok.yml
            for tunnel in data.get('tunnels', []):
                # We specifically look for the tunnel we defined in ngrok.yml
                if tunnel.get('name') == 'ssh-access': 
                    # The public URL will be in the format 'tcp://<host>:<port>'
                    public_url = tunnel['public_url']
                    # Strip the 'tcp://' prefix
                    return public_url.replace('tcp://', ''), "SUCCESS"
            
            # API is reachable, but tunnel list is empty or tunnel not found yet
            last_error_message = f"Ngrok API reached, but tunnel 'ssh-tunnel' not yet established."

        except requests.exceptions.RequestException as e:
            # API is not reachable (Ngrok hasn't finished booting)
            last_error_message = f"Ngrok API unreachable: {e}. Waiting for Ngrok to fully start."
        except Exception as e:
            # Other errors (e.g., JSON parsing)
            last_error_message = f"Ngrok Info Error: {e}"
        
        # If this wasn't the last attempt, wait and retry
        if attempt < MAX_RETRIES - 1:
            print(f"Attempt {attempt + 1}/{MAX_RETRIES} failed. {last_error_message}. Retrying in {RETRY_DELAY}s...")
            time.sleep(RETRY_DELAY)

    # If the loop completes without success
    return last_error_message, "ERROR"

def update_duckdns(ip):
    """
    Calls the DuckDNS API to update the IP address for the configured domain.
    Returns the update status message.
    """
    url = f"https://www.duckdns.org/update?verbose=true&domains={DUCKDNS_DOMAIN}&token={DUCKDNS_TOKEN}&ipv6={ip}"
    
    status_message = ""

    try:
        # Request the update.
        response = requests.get(url, timeout=10)
        
        # The response text will be 'OK', 'KO', or 'ENOCHANGE'
        response_text = response.text.strip()

        print(response_text)
        
        if response.status_code == 200:
            if response_text.startswith("OK"):
                status_message = "SUCCESS: DuckDNS update completed."
            elif response_text.startswith("KO"):
                status_message = "FAILURE: DuckDNS update failed. Check token/domain in .env."
            elif response_text.startswith("ENOCHANGE"):
                status_message = "NO CHANGE: IP address was the same as the last update."
            else:
                status_message = f"WARNING: DuckDNS returned an unexpected status: {response_text}"
        else:
            status_message = f"FAILURE: HTTP error {response.status_code} during DuckDNS request."
            
    except requests.exceptions.RequestException as e:
        status_message = f"NETWORK ERROR: Failed to connect to DuckDNS. Details: {e}"
    except Exception as e:
        status_message = f"GENERAL ERROR during DuckDNS update: {e}"

    return status_message

def send_update_email(update_status, ip_address, ngrok_info, ngrok_status):
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
        ngrok_host, ngrok_port = ngrok_info.rsplit(':', 1)
        # UPDATED: Use the configurable SSH_USER
        ngrok_cmd = f"ssh -p {ngrok_port} {SSH_USER}@{ngrok_host}"
        ngrok_details = (
            f"**✅ Ngrok Tunnel is Active**\n"
            f"Connect using this command:\n"
            f"   {ngrok_cmd}"
        )
    else:
        ngrok_details = f"**❌ Ngrok Tunnel Status:** {ngrok_info}. \n(Please check if the `ngrok tcp 22` command is running on your Pi.)"


    body = (
        f"Hello from your Raspberry Pi ({hostname})!\n\n"
        f"--- Remote Access via Ngrok (Bypassing Router Firewall) ---\n\n"
        f"{ngrok_details}\n\n"
        f"--- DuckDNS Update Status ---\n"
        f"Status: {update_status}\n"
        f"Domain: {DUCKDNS_DOMAIN}\n"
        f"Public IPv6 Detected by icanhazip: {ip_address}\n\n"
        f"--- Local Connection Fallback ---\n"
        f"If you are on the same Wi-Fi network, connect using:\n"
        # UPDATED: Use the configurable SSH_USER
        f"   ssh {SSH_USER}@{local_ip}"
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
    public_ipv6 = get_current_public_ipv6()
    status = update_duckdns(public_ipv6)
    ngrok_info, ngrok_status = get_ngrok_tunnel_info()
    send_update_email(status, public_ipv6, ngrok_info, ngrok_status)
