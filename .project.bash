alias build-tcs='docker-compose build tcs'
alias run-tcs='docker-compose run -d --rm --service-ports tcs'
alias build-tmssim='docker-compose build tms-simulator'
alias run-tmssim='docker-compose up -d tms-simulator'
alias ..='cd ..'
alias rm-container='docker rm $(docker ps -q)'
alias rm-images='docker rmi $(docker images -q)'
alias rm-exited='docker rm $(docker ps -a -f status=exited -q)'
alias rm-dangling-volumes='docker volume rm $(docker volume ls -f dangling=true -q)'
alias ls-exited='docker ps -aq -f status=exited'
alias tcs-down='docker-compose down'
alias build-mangle='docker-compose build mangle'
alias rm-volumes='docker volume rm $(docker volume ls -f dangling=true -q)'
alias alpine='docker run -it --rm alpine /bin/ash'
alias run-pbxsim='node lib/pbx-simulator/pbx-simulator.js'
alias build-postgres='docker-compose build --no-cache tcs-postgres'
alias run-postgres='docker-compose run -d --service-ports tcs-postgres'
alias pgbackup='pg_basebackup -P -D backup -h $DOCKER_HOST_IP -U postgres -F tar'
alias pg='docker exec -it tcs-postgres psql --username postgres'
alias tcs-up='docker-compose up --build -d'
export DOCKER_HOST_IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | grep -v '172.')
export TCS_PORT=3456
export TMS_HOST=$DOCKER_HOST_IP
export TMS_PORT=6543
export BACKUP_DIRECTORY=/Users/Rod/postgres_backups/
export BACKUP_SCHEDULE='42 * * * * *'
export BACKUP_PURGE_PERIOD_UNITS=minutes
export BACKUP_PURGE_PERIOD_LIMIT=5
export PBX_SIMULATOR_SOURCE_DIRECTORY=../smdr-data/smdr-data-002
export MANGLE_SOURCE_DIRECTORY=../smdr-data/smdr-data-002
export MANGLE_TARGET_DIRECTORY=../smdr-data/smdr-data-003
export BACKUP_PURGE_EPOCH=minutes
export BACKUP_PURGE_AGE_LIMIT=5
export COMPOSE_PROJECT_NAME=tcs

mangle () 
{ 
    docker-compose run --rm -e MANGLE_SOURCE_DIRECTRY="$1" -e MANGLE_TARGET_DIRECTORY="$2" --entrypoint="node lib/mangle/mangle.js" tcs-node
}
pbx-simulator ()
{
    docker-compose run --rm -e PBX_SIMULATOR_SOURCE_DIRECTORY="$1" --entrypoint="node lib/pbx-simulator/pbx-simulator.js" tcs-node
}

function tcsup
{
    export TCS_VERSION=:$1;
    if docker pull ccbcadmin/tcs-node$TCS_VERSION; then
        : 
    else
        return 1;
    fi
    if docker pull ccbcadmin/tcs-postgres$TCS_VERSION; then
        : 
    else
        return 1;
    fi
    docker-compose -f docker-compose.yml up -d --no-build pbx-interface
}

# Remove dangling/untagged images
alias clean-images='docker images -q --filter dangling=true | xargs docker rmi'

# Remove containers created after a specific container
# docker ps --since a1bz3768ez7g -q | xargs docker rm

# Remove containers created before a specific container
# docker ps --before a1bz3768ez7g -q | xargs docker rm

