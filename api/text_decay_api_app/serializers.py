from rest_framework import serializers


class ImagesListSerializer(serializers.Serializer):
    url = serializers.CharField()
    name = serializers.CharField()
    size_bytes = serializers.IntegerField()


class UploadImageSerializer(serializers.Serializer):
    file = serializers.FileField()  # Use ImageField for image validation
    use_url = True
