#!/bin/bash

PROGNAME=$(basename $0)

# exports for docker-compose
export CORE_COMPOSE_ARGS=' -f docker-compose.yml -f docker-compose/core/docker-compose.yml -p core '
export DEV_COMPOSE_ARGS=' -f docker-compose.yml -f docker-compose/docker-compose.yml -f docker-compose/dev/docker-compose.yml -p dev '
export QA_COMPOSE_ARGS=' -f docker-compose.yml  -f docker-compose/docker-compose.yml -f docker-compose/qa/docker-compose.yml -p qa '
export PROD_COMPOSE_ARGS=' -f docker-compose.yml -f docker-compose/docker-compose.yml -f docker-compose/prod/docker-compose.yml -p prod '

# Production environment is the default
export COMPOSE_ARGS="$PROD_COMPOSE_ARGS"
export TCSENV=Production

# Allow access to bash scripts
export PATH=./scripts:$PATH

# define various functions
source scripts/bash-functions

if [ $# -gt 1 ]; then echo "Usage : tcsproj [ TCS Version ]"; exit 1; fi

# If a version number is provided, then ensure that it is of the required form
VERSION_REGEX="^v[0-9]+\.[0-9]+$"
if [ $# -eq 1 ]; then
    if ! [[ $1 =~ $VERSION_REGEX ]]; then
        echo 'TCS Version must be of the form vX.Y, where X and Y are both integers'
        exit 1
    else
        # Ensure TCS software is up-to-date
        if ! git pull 2>&1 >/dev/null; then msg 'Pull from GitHub Failed'; return 1; fi
        if ! git checkout tags/$1 -b $1 2>&1 >/dev/null; then msg 'Checkout Failed'; return 1; fi
        echo 'export TCS_VERSION=:'$1 > ./.tcs.version
    fi
fi

# Load TCS environment variables
. ./.tcs.env
. ./.tcs.version

echo 'TCS Version'$TCS_VERSION

# Application aliases
alias build-dev='docker-compose '"$DEV_COMPOSE_ARGS"' build'
alias build-qa='docker-compose '"$QA_COMPOSE_ARGS"' build'
alias build-prod='docker-compose '"$PROD_COMPOSE_ARGS"' build'
alias run-tmssim='docker-compose '"$DEV_COMPOSE_ARGS"' run -d --name DEV-tms-simulator tms-simulator'
alias run-mangle='docker-compose '"$DEV_COMPOSE_ARGS"' run --rm --name DEV-mangle \
    -e MANGLE_SOURCE_DIRECTORY=/smdr-data/smdr-data-002 \
    -e MANGLE_TARGET_DIRECTORY=/smdr-data/smdr-data-003 \
    mangle'
alias run-pbxsim='docker-compose '"$DEV_COMPOSE_ARGS"' run --rm --name DEV-pbx-simulator \
    -e PBX_SIMULATOR_SOURCE_DIRECTORY=/smdr-data/smdr-data-002 \
    pbx-simulator'
alias pg1-exec='docker exec -it pg1 /bin/bash'
alias pg2-exec='docker exec -it pg2 /bin/bash'

# Aliases to manage Docker
alias rm-containers='docker rm $(docker ps -q)'
alias rm-images='docker rmi $(docker images -q)'
alias rm-exited='docker rm $(docker ps -a -f status=exited -q)'
alias rm-dangling-volumes='docker volume rm $(docker volume ls -f dangling=true -q) >> /dev/null'
alias ls-exited='docker ps -aq -f status=exited'
alias barman-exec='docker exec -it barman /bin/bash'

mangle () 
{
    if [ -z ${TCS_VERSION+x} ]; then echo "TCS_VERSION undefined"; return 1; fi

    if ! docker pull ccbcadmin/tcs-image$TCS_VERSION >> /dev/null; then
        return 1;
    fi
     
    docker-compose $PROD_COMPOSE_ARGS run --rm --name mangle -e MANGLE_SOURCE_DIRECTORY="$1" -e MANGLE_TARGET_DIRECTORY="$2" mangle
}

pbx-simulator ()
{
    if [ -z ${TCS_VERSION+x} ]; then echo "TCS_VERSION undefined"; return 1; fi

    if ! docker pull ccbcadmin/tcs-image$TCS_VERSION >> /dev/null; then
        return 1;
    fi    
    docker-compose $PROD_COMPOSE_ARGS run --rm --name pbx-simulator -e PBX_SIMULATOR_SOURCE_DIRECTORY="$1" pbx-simulator
}

tms-simulator ()
{
    if [ -z ${TCS_VERSION+x} ]; then echo "TCS_VERSION undefined"; return 1; fi

    if ! docker pull ccbcadmin/tcs-image$TCS_VERSION >> /dev/null; then
        return 1;
    fi
    docker-compose $PROD_COMPOSE_ARGS up -d --no-build --remove-orphans tms-simulator
}