ARG POSTIZ_VERSION=v2.25.3
FROM ghcr.io/gitroomhq/postiz-app:${POSTIZ_VERSION}

COPY patch-linkedin-page.js /tmp/patch-linkedin-page.js
RUN node /tmp/patch-linkedin-page.js /app && rm /tmp/patch-linkedin-page.js
