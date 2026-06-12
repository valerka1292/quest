#!/bin/sh
if [ -z "$JWT_SECRET" ]; then
  export JWT_SECRET=$(openssl rand -base64 48)
fi
if [ -z "$JWT_REFRESH_SECRET" ]; then
  export JWT_REFRESH_SECRET=$(openssl rand -base64 48)
fi
exec node dist/app.js
