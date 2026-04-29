#!/bin/sh

if [ ! -f /data/aclfile.acl ]; then
    echo "user default on >${REDIS_USER_PASSWORD} allkeys allcommands" > /data/aclfile.acl
fi

exec dragonfly --requirepass "${REDIS_USER_PASSWORD}" --dir /data --aclfile /data/aclfile.acl