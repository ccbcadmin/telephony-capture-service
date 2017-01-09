# I put a variable in my scripts named PROGNAME which
# holds the name of the program being run.  You can get this
# value from the first item on the command line ($0).

PROGNAME=$(basename $0)

# various useful bash functions
echo '11111'

source ./scripts/bash-functions

# Allow access to bash scripts
export PATH=./scripts:$PATH

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
echo '11111'
source ./.tcs.env
echo '22222'
source ./.tcs.version

echo 'TCS Version'$TCS_VERSION

# Aliases to aid Docker usage
alias build-tcs='docker-compose build'
alias create-pg1='docker-compose create pg1'
alias create-pg2='docker-compose create pg2'
alias run-pg1='docker-compose run -d --name pg1 pg1'
alias run-pg2='docker-compose run -d --name pg2 pg2'
alias run-tmssim='docker-compose run -d --name tms-simulator tms-simulator'
alias run-mangle='docker-compose run --rm --name mangle -e MANGLE_SOURCE_DIRECTORY=/smdr-data/smdr-data-002 -e MANGLE_TARGET_DIRECTORY=/smdr-data/smdr-data-003 mangle'
alias run-pbxsim='docker-compose run --rm --name pbx-simulator -e PBX_SIMULATOR_SOURCE_DIRECTORY=/smdr-data/smdr-data-002 pbx-simulator'
alias rm-containers='docker rm $(docker ps -q)'
alias rm-images='docker rmi $(docker images -q)'
alias rm-exited='docker rm $(docker ps -a -f status=exited -q)'
alias rm-dangling-volumes='docker volume rm $(docker volume ls -f dangling=true -q) >> /dev/null'
alias ls-exited='docker ps -aq -f status=exited'
alias tcs-down='docker-compose down'
alias tcs-down-v='docker-compose down -v'
alias pg1-exec='docker exec -it pg1 /bin/bash'
alias pg2-exec='docker exec -it pg2 /bin/bash'
alias tcsup='docker-compose up --build -d'
alias barman-exec='docker exec -it barman /bin/bash'

mangle () 
{
    if [ -z ${TCS_VERSION+x} ]; then echo "TCS_VERSION undefined"; return 1; fi

    if ! docker pull ccbcadmin/tcs-image$TCS_VERSION >> /dev/null; then
        return 1;
    fi
     
    docker-compose run --rm --name mangle -e MANGLE_SOURCE_DIRECTORY="$1" -e MANGLE_TARGET_DIRECTORY="$2" mangle
}

pbx-simulator ()
{
    if [ -z ${TCS_VERSION+x} ]; then echo "TCS_VERSION undefined"; return 1; fi

    if ! docker pull ccbcadmin/tcs-image$TCS_VERSION >> /dev/null; then
        return 1;
    fi    
    docker-compose run --rm --name pbx-simulator -e PBX_SIMULATOR_SOURCE_DIRECTORY="$1" pbx-simulator
}

pg1 ()
{
    if [ -z ${TCS_VERSION+x} ]; then echo "TCS_VERSION undefined"; return 1; fi

    if ! docker pull ccbcadmin/tcs-image$TCS_VERSION >> /dev/null; then
        return 1;
    fi
    docker-compose -f docker-compose.yml up -d --no-build --remove-orphans pg1
}

pg2 ()
{
    if [ -z ${TCS_VERSION+x} ]; then echo "TCS_VERSION undefined"; return 1; fi

    if ! docker pull ccbcadmin/tcs-image$TCS_VERSION >> /dev/null; then
        return 1;
    fi
    docker-compose -f docker-compose.yml up -d --no-build --remove-orphans pg2
}

tms-simulator ()
{
    if [ -z ${TCS_VERSION+x} ]; then echo "TCS_VERSION undefined"; return 1; fi

    if ! docker pull ccbcadmin/tcs-image$TCS_VERSION >> /dev/null; then
        return 1;
    fi
    docker-compose -f docker-compose.yml up -d --no-build --remove-orphans tms-simulator
}
