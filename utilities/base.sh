# no shebang, this is meant to be sourced!

ESCAPE=$'\e'
red_text="${ESCAPE}[1;31;47m"
normal_text="${ESCAPE}[0m"

push() {
  target=$1
  pushd $target > /dev/null
}

pop() {
  popd > /dev/null
}

echo_error() {
  msg=$1
  echo "$red_text!!! $msg !!!$normal_text"
}

run_config() {
  werkzeug=$1
  status=$(git_status $werkzeug)
  echo "WERKEN: $werkzeug [$status]"

  verify_bauen $werkzeug
  # backup existing resources (if not already linked or copied)
  num_tasks=$(yq e '.tasks[].location' ./bauen.yaml | wc -l | sed 's/^ *//')
  echo "found a number of tasks ($num_tasks)"
  for ((i=0; i< $num_tasks; ++i)); do
    location=$(yq e ".tasks[$i].location" ./bauen.yaml)
    source=$(yq e ".tasks[$i].source" ./bauen.yaml)
    operation=$(yq e ".tasks[$i].operation" ./bauen.yaml)
    preserve_original=$(yq e ".tasks[$i].preserve_original" ./bauen.yaml)
    echo "i is $i"
    echo "location is $location"
    echo "source is $source"
    echo "operation is $operation"
    echo "preserve_original is $preserve_original"
  done
  # create a symbolic link
}

verify_bauen() {
  werkzeug=$1
  push $werkzeug
  if [ -f ./bauen.yaml ]; then
    if [ "$(yq .tasks ./bauen.yaml)" == "null" ]; then
      echo_error "$werkzeug/bauen.yaml has no tasks"
      exit 1
    fi
  else
    echo_error "$werkzeug/bauen.yaml not found"
    exit 1
  fi
}

ensure_available() {
  source=$1
  werkzeug=$source
  if [[ "$source" == "git@"* ]] || [[ "$source" == "https://"* ]]; then
    werkzeug=$(ensure_git $source)
  elif [[ "$source" == "../"* ]] || [[ "$source" == "./"* ]] || [[ "$source" == "/"* ]]; then
    werkzeug=$(ensure_local $source)
  elif [[ "$source" == *"/"* ]]; then
    werkzeug=$(ensure_git "git@github.com:$source")
  else
    echo_error "I don't understand this source: $source"
    exit 1
  fi
  echo $werkzeug
}

ensure_local() {
  werkzeug=$1
  if [ ! -d $werkzeug ]; then
    echo_error "$werkzeug not found"
    exit 1
  fi
  echo $werkzeug
}

ensure_git() {
  remote=$1
  werkzeug="$(echo $remote | sed 's/.git$//' | rev | cut -d "/" -f 1 | rev)"
  if [ ! -d "./werkzeuge/$werkzeug" ]; then
    push ./werkzeuge
    $bin_git clone $remote
    pop
  fi
  echo "./werkzeuge/$werkzeug $status"
}

git_status() {
  werkzeug=$1
  push $werkzeug
  git_status=$($bin_git status --porcelain)
  if [ -z "$git_status" ]; then
    status="clean"
  else
    status="changes: $git_status"
  fi
  pop
  echo "$status"
}

for util in yq git wc; do
  if [ -z "$(which $util)" ]; then
    echo_error "You need to install $util"
    exit 1
  fi
  declare "bin_$util=$(which $util)"
done
