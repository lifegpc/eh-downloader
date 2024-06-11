#!/bin/bash
getent passwd $(id -u) > /dev/null 2>&1
if [ $? -ne 0 ]; then
    getent group $(id -g)
    if [ $? -ne 0 ]; then
        su root -c "groupadd -g $(id -g) eh"
    fi
    su root -c "useradd -g $(id -g) -m -s /bin/bash -u $(id -u) eh"
fi
deno task server
