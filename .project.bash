# I put a variable in my scripts named PROGNAME which
# holds the name of the program being run.  You can get this
# value from the first item on the command line ($0).

PROGNAME=$(basename $0)

function error_exit
{
#	----------------------------------------------------------------
#	Function for exit due to fatal program error
#		Accepts 1 argument:
#			string containing descriptive error message
#	----------------------------------------------------------------
	echo "${PROGNAME}: ${1:-"Unknown Error"}" 1>&2
	return 1
}

# Example call of the error_exit function.  Note the inclusion
# of the LINENO environment variable.  It contains the current
# line number.

# Record the TCS_VERSION if set
if [ $# -eq 1 ]
  then
    export TCS_VERSION=:$1
fi

# Aliases to aid Docker usage
alias build-tcs='docker-compose build'
alias run-tcs='docker-compose run -d --rm --service-ports --name pbx-interface pbx-interface'
alias run-pg1='docker-compose run -d --name pg1 pg1'
alias run-pg2='docker-compose run -d --name pg2 pg2'
alias build-tmssim='docker-compose build tms-simulator'
alias run-tmssim='docker-compose up -d tms-simulator'
alias run-mangle='docker-compose run --rm --name mangle -e MANGLE_SOURCE_DIRECTORY=/smdr-data/smdr-data-002 -e MANGLE_TARGET_DIRECTORY=/smdr-data/smdr-data-003 mangle'
alias run-pbxsim='docker-compose run --rm --name pbx-simulator -e PBX_SIMULATOR_SOURCE_DIRECTORY=/smdr-data/smdr-data-002 pbx-simulator'
alias rm-containers='docker rm $(docker ps -q)'
alias rm-images='docker rmi $(docker images -q)'
alias rm-exited='docker rm $(docker ps -a -f status=exited -q)'
alias rm-dangling-volumes='docker volume rm $(docker volume ls -f dangling=true -q) >> /dev/null'
alias ls-exited='docker ps -aq -f status=exited'
alias tcs-down='docker-compose down'
alias tcs-down-v='docker-compose down -v'
alias pg1='docker exec -it pg1 psql --username postgres'
alias pg2='docker exec -it pg2 psql --username postgres'
alias pg1-exec='docker exec -it pg1 /bin/bash'
alias pg2-exec='docker exec -it pg2 /bin/bash'
alias tcsup='docker-compose up --build -d'
alias barman='docker exec -it barman /bin/bash'
alias tcsvers='echo $TCS_VERSION'

source ~/.tsc.bash

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

switch-pg ()
{
    # Stop the inflow to the database
    docker stop database-interface >> /dev/null

    # Decide which direction the switch is to go

    docker inspect --format='{{.State.Running}}' pg1 >> /dev/null
    if [ $? != 0 ]; then echo 'Container pg1 missing'; return 1; fi

    docker inspect --format='{{.State.Running}}' pg2 >> /dev/null
    if [ $? != 0 ]; then echo 'Container pg2 missing'; return 1; fi
   
    pg1_running=$(docker inspect --format='{{.State.Running}}' pg1)
    pg2_running=$(docker inspect --format='{{.State.Running}}' pg2)

    if [ "$pg1_running" == "$pg2_running" ]; then
        if [ "$pg1_running" == "true" ]; then
            echo 'Confused state: Both Postgres containers are running.';
            return 1;
        else
            echo 'Confused state: Neither Postgres container is running.';
            return 1;       
        fi
    fi
    
    if [ "$pg1_running" == "true" ]; then
        echo 'Switching from pg1 to pg2'
        FROM_PG='pg1'
        TO_PG='pg2'
    else
        echo 'Switching from pg2 to pg1'
        FROM_PG='pg2'
        TO_PG='pg1'
    fi

    # Ensure that inflows to the database are stopped
    docker stop database-interface &> /dev/null
    if [ $? != 0 ]; then return $?; else echo Database Inflow Suspended; fi

    # Do a final backup
    docker exec -it barman barman backup $FROM_PG
    if [ $? != 0 ]; then return $?; else echo Backup Complete; fi

    # Configure the outgoing container so that it will not be restarted after a reboot
    docker update --restart no $FROM_PG 
    if [ $? != 0 ]; then return $?; else echo $FROM_PG Restart Disabled; fi

    # Now finally shutdown the outgoing container
    docker stop $FROM_PG
    if [ $? != 0 ]; then return $?; else echo $FROM_PG Stopped; fi

    # 'barman' must be the owner of the recovery directory
    if [ $TO_PG == 'pg1' ]; then
        docker exec -it barman sh -c 'chown -R barman.barman /pg1_data; exit $?;'
    else
        docker exec -it barman sh -c 'chown -R barman.barman /pg2_data; exit $?;'
    fi
    if [ $? != 0 ]; then echo 'chown failure'; return $?; else echo 'chown Successful'; fi

    # Use barman to recover the latest version of the database
    if [ $TO_PG == 'pg1' ]; then
        docker exec -it barman sh -c 'barman recover pg2 latest /pg1_data; exit $?;'
    else
        docker exec -it barman sh -c 'barman recover pg1 latest /pg2_data; exit $?;'
    fi
    if [ $? != 0 ]; then echo 'Recovery Failure'; return $?; else echo 'Recovery Successful'; fi
   
    # Now start the incoming database container
    docker start $TO_PG
    if [ $? != 0 ]; then return $?; else echo $TO_PG Started; fi

    # Configure the incoming container to auto restart in the case of a reboot
    docker update --restart unless-stopped $TO_PG
    if [ $? != 0 ]; then return $?; else echo $TO_PG Configured to start at reboot; fi

    # Restart dataflow
    docker start database-interface
    if [ $? != 0 ]; then return $?; else echo Database Inflow Restarted; fi

    echo 'Postgres Container Switch Successful'
}

# Remove dangling/untagged images
alias clean-images='docker images -q --filter dangling=true | xargs docker rmi'

# Remove containers created after a specific container
# docker ps --since a1bz3768ez7g -q | xargs docker rm

# Remove containers created before a specific container
# docker ps --before a1bz3768ez7g -q | xargs docker rm

# export DOCKER_HOST_IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | grep -v '172.')
