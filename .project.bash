# Record the TCS_VERSION if set
if [ $# -eq 1 ]
  then
    export TCS_VERSION=:$1
fi

# Aliases to aid Docker usage
alias build-tcs='docker-compose build'
alias run-tcs='docker-compose run -d --rm --service-ports --name pbx-interface pbx-interface'
alias build-tmssim='docker-compose build tms-simulator'
alias run-tmssim='docker-compose up -d tms-simulator'
alias run-pbxsim='docker-compose run --rm --name pbx-simulator -e PBX_SIMULATOR_SOURCE_DIRECTORY=/smdr-data/smdr-data-002 pbx-simulator'
alias rm-containers='docker rm $(docker ps -q)'
alias rm-images='docker rmi $(docker images -q)'
alias rm-exited='docker rm $(docker ps -a -f status=exited -q)'
alias rm-dangling-volumes='docker volume rm $(docker volume ls -f dangling=true -q) >> /dev/null'
alias ls-exited='docker ps -aq -f status=exited'
alias tcs-down='docker-compose down'
alias tcs-down-v='docker-compose down -v'
alias alpine='docker run -it --rm alpine /bin/ash'
alias pgbackup='pg_basebackup -P -D backup -h $DOCKER_HOST_IP -U postgres -F tar'
alias pg1='docker exec -it postgres1 psql --username postgres'
alias pg2='docker exec -it postgres2 psql --username postgres'
alias pg1-exec='docker exec -it postgres1 /bin/sh'
alias pg2-exec='docker exec -it postgres2 /bin/sh'
alias tcsup='docker-compose up --build -d'
alias barman='docker exec -it barman /bin/bash'
alias tcsvers='echo $TCS_VERSION'

export BACKUP_SCHEDULE='42 * * * * *'
export BACKUP_PURGE_PERIOD_UNITS=minutes
export BACKUP_PURGE_PERIOD_LIMIT=5
export COMPOSE_PROJECT_NAME=tcs
export DOCKER_HOST_IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | grep -v '172.')
#export DOCKER_HOST_IP=192.168.2.131
export POSTGRES_PASSWORD=Dsbhottf4$
export TCS_PORT=3456
export TMS_ACTIVE=1
export TMS_HOST=$DOCKER_HOST_IP
export TMS_PORT=6543

mangle () 
{
    if [ -z ${TCS_VERSION+x} ]; then echo "TCS_VERSION undefined"; return 1; fi

    if docker pull ccbcadmin/tcs-image$TCS_VERSION >> /dev/null; then
        : 
    else
        return 1;
    fi
     
    docker-compose run --rm --name mangle -e MANGLE_SOURCE_DIRECTORY="$1" -e MANGLE_TARGET_DIRECTORY="$2" mangle
}
pbx-simulator ()
{
    if [ -z ${TCS_VERSION+x} ]; then echo "TCS_VERSION undefined"; return 1; fi

    if docker pull ccbcadmin/tcs-image$TCS_VERSION >> /dev/null; then
        : 
    else
        return 1;
    fi    
    docker-compose run --rm --name pbx-simulator -e PBX_SIMULATOR_SOURCE_DIRECTORY="$1" pbx-simulator
}

tcs-up ()
{
    if [ -z ${TCS_VERSION+x} ]; then echo "TCS_VERSION undefined"; return 1; fi

    if docker pull ccbcadmin/tcs-image$TCS_VERSION >> /dev/null; then
        : 
    else
        return 1;
    fi
    docker-compose -f docker-compose.yml up -d --no-build --remove-orphans pbx-interface
}

tms-simulator-up ()
{
    if [ -z ${TCS_VERSION+x} ]; then echo "TCS_VERSION undefined"; return 1; fi

    if docker pull ccbcadmin/tcs-image$TCS_VERSION >> /dev/null; then
        : 
    else
        return 1;
    fi
    docker-compose -f docker-compose.yml up -d --no-build --remove-orphans tms-simulator
}

# Remove dangling/untagged images
alias clean-images='docker images -q --filter dangling=true | xargs docker rmi'

# Remove containers created after a specific container
# docker ps --since a1bz3768ez7g -q | xargs docker rm

# Remove containers created before a specific container
# docker ps --before a1bz3768ez7g -q | xargs docker rm

