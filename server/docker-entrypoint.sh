#!/bin/sh
if [ -z "$JWT_SECRET" ]; then
  export JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('base64'))")
fi
if [ -z "$JWT_REFRESH_SECRET" ]; then
  export JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('base64'))")
fi
exec node dist/app.js
