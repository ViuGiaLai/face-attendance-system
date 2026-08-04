# Deploy to Oracle Cloud Infrastructure (OCI)

This deployment runs the React frontend and Flask API behind one Nginx endpoint. The API and Redis are private to Docker; only HTTP port 80 is exposed.

## Information you need to provide

Do **not** send a private SSH key, database password, JWT secret, or the contents of `.env` in chat.

Provide these non-secret values instead:

1. OCI VM public IP address or domain name.
2. SSH username (normally `ubuntu` for an Ubuntu image).
3. Operating system image and CPU architecture (`x86_64` or `aarch64`).
4. Your preferred domain name, if HTTPS is required.

Keep the private key only on your computer. The matching public key is added in the OCI Console when creating the VM.

## OCI network rules

In the VCN security list or network security group, allow only:

- TCP 22 from your own public IP address.
- TCP 80 from the internet.
- TCP 443 from the internet after HTTPS is configured.

Do not expose ports 5000, 5432, or 6379.

## Server setup

Copy `deploy/oracle-setup.sh` to the VM and run it once. Then clone the repository, upload `backend/.env` using a secure method, and start the production stack:

```bash
docker compose -f docker-compose.production.yml up -d --build
docker compose -f docker-compose.production.yml ps
curl http://localhost/api/health
```

For a domain name, add TLS with Nginx + Certbot before opening the application publicly.

## Architecture warning

This project uses `dlib-bin` for face recognition. Test the backend image on the same CPU architecture as the OCI VM before production. An x86_64 VM is the safer choice for this dependency; an ARM Ampere A1 VM may need a compatible dlib wheel or a separate AI service.
