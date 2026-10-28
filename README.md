# postiz-app (patched)

The official Postiz image with one fix for the **LinkedIn Page** channel.

## Why

The upstream LinkedIn Page provider cannot connect with a LinkedIn app that only
has the Community Management API product, which is the product LinkedIn requires
to post as a Company Page:

- It asks for the `openid` and `profile` scopes. They belong to "Sign In with
  LinkedIn using OpenID Connect", which cannot share an app with the Community
  Management API, so LinkedIn rejects the whole authorization.
- It sends `prompt=none`, which fails on a first connection because there is no
  earlier consent to reuse.

Upstream tracks this in issue #1582 of `gitroomhq/postiz-app`.

## What the patch changes

`patch-linkedin-page.js` edits the compiled `linkedin.page.provider.js` inside the
image. The personal LinkedIn provider is left untouched.

1. Removes `openid` and `profile` from the requested scopes.
2. Removes `prompt=none` from the authorization URL.
3. Routes the two `/v2/userinfo` calls (connect and token refresh) through
   `/v2/me`, mapping `id` and the localized name to the shape the code expects.

Each change must match the expected number of times. If a new Postiz version
changes that code, the build fails instead of shipping an unpatched image.

## Build and deploy

GitHub Actions builds `linux/amd64` on every push to `main` and publishes two tags:

- `ghcr.io/red-valley/postiz-app:<version>-li`, which moves with each build.
- `ghcr.io/red-valley/postiz-app:<version>-li-b<run number>`, which never changes.

Deploy the immutable tag. A reused moving tag can leave the server on the cached
old image.

To move to a new Postiz version, change `POSTIZ_VERSION` in the workflow and push.

## Retiring it

When upstream fixes the LinkedIn Page provider, point the deployment back to
`ghcr.io/gitroomhq/postiz-app` and archive this repo.
