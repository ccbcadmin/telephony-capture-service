alias build-tcs='docker-compose build tcs'
alias run-tcs='docker-compose run -d --rm --service-ports tcs'
alias build-tmssim='docker-compose build tms-simulator'
alias run-tmssim='docker-compose run -d --rm --service-ports tms-simulator'
alias ..='cd ..'
alias rm-dock='docker rm $(docker ps -q)'
alias rm-images='docker rmi $(docker images -q)'
alias rm-exited='docker ps -aq --no-trunc | xargs docker rm'
alias ls-exited='docker ps -aq -f status=exited'
alias tcs-down='docker-compose down'
alias build-mangle='docker-compose build mangle'
alias run-mangle='docker-compose run mangle'
alias rm-volumes='docker volume rm $(docker volume ls -f dangling=true -q)'
alias alpine='docker run -it --rm alpine /bin/ash'
alias run-pbxsim='node lib/pbx-simulator/pbx-simulator.js'
alias build-postgres='docker-compose build --no-cache postgres'
alias run-postgres='docker-compose run -d --service-ports postgres'
alias pgbackup='pg_basebackup -P -D backup -h $DOCKER_MACHINE_IP -U postgres -F tar'
alias pg='docker exec -it tcs_postgres_run_1 psql --username postgres'
export DOCKER_MACHINE_IP=10.211.55.7
export TCS_PORT=3456
export TMS_HOST=$DOCKER_MACHINE_IP
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
mangle () 
{ 
    docker-compose run --rm -e MANGLE_SOURCE_DIRECTRY="$1" -e MANGLE_TARGET_DIRECTORY="$2" --entrypoint="node lib/mangle/mangle.js" command-line
}
pbx-simulator ()
{
    docker-compose run --rm -e PBX_SIMULATOR_SOURCE_DIRECTRY="$1" --entrypoint="node lib/pbx-simulator/pbx-simulator.js" command-line
}
# Remove dangling/untagged images
alias clean-images='docker images -q --filter dangling=true | xargs docker rmi'

# Remove containers created after a specific container
# docker ps --since a1bz3768ez7g -q | xargs docker rm

# Remove containers created before a specific container
# docker ps --before a1bz3768ez7g -q | xargs docker rm

