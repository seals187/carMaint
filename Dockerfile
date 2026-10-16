# CarMaint – PocketBase liefert API und Website (pb_public) aus einem Container aus.
FROM alpine:3.22

ARG PB_VERSION=0.40.5
# Wird von "docker buildx" automatisch gesetzt (amd64, arm64, arm)
ARG TARGETARCH
# CarMaint-Version, wird vom GitHub-Workflow gesetzt (z. B. 0.1.0 oder edge)
ARG VERSION=dev

RUN set -eux; \
    apk add --no-cache ca-certificates tzdata wget unzip; \
    arch="${TARGETARCH:-$(uname -m)}"; \
    case "$arch" in \
      amd64|x86_64)  arch=amd64 ;; \
      arm64|aarch64) arch=arm64 ;; \
      arm|armv7l)    arch=armv7 ;; \
      *) echo "Nicht unterstützte Architektur: $arch" >&2; exit 1 ;; \
    esac; \
    zip="pocketbase_${PB_VERSION}_linux_${arch}.zip"; \
    base="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}"; \
    cd /tmp; \
    wget -q "$base/$zip" "$base/checksums.txt"; \
    grep " $zip\$" checksums.txt | sha256sum -c -; \
    mkdir -p /pb; \
    unzip -q "$zip" pocketbase -d /pb; \
    rm -f "$zip" checksums.txt; \
    apk del unzip; \
    adduser -D -H -u 1000 carmaint; \
    mkdir -p /pb/pb_data; \
    chown carmaint:carmaint /pb/pb_data

COPY pb_migrations /pb/pb_migrations
COPY pb_hooks /pb/pb_hooks
COPY pb_public /pb/pb_public

ENV APP_VERSION=${VERSION}
LABEL org.opencontainers.image.title="CarMaint" \
      org.opencontainers.image.version="${VERSION}"

USER carmaint
WORKDIR /pb
VOLUME /pb/pb_data
EXPOSE 8090

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8090/api/health > /dev/null || exit 1

# --encryptionEnv: verschlüsselt die Server-Einstellungen, wenn PB_ENCRYPTION_KEY gesetzt ist
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data", \
     "--publicDir=/pb/pb_public", "--hooksDir=/pb/pb_hooks", "--migrationsDir=/pb/pb_migrations", \
     "--encryptionEnv=PB_ENCRYPTION_KEY", "--automigrate=false"]
