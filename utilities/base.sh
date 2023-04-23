# no shebang, this is meant to be sourced!

ESCAPE=$'\e'
red_text="${ESCAPE}[1;31;47m"
normal_text="${ESCAPE}[0m"

run_config() {
  werkzeug=$1
  status=$(git_status $werkzeug)
  echo "WERKEN: $werkzeug [$status]"

  verify_bauen $werkzeug

  # backup existing resources (if not already linked or copied)
  num_tasks=$(yq e '.tasks[].operation' ./bauen.yaml | wc -l | sed 's/^ *//')
  echo "found a number of tasks ($num_tasks)"
  for ((i=0; i< $num_tasks; ++i)); do
    target_location=$(yq e ".tasks[$i].target_location" ./bauen.yaml)
    realpath $(echo $target_location)
    ls $target_location
    exit 0
    source=$(yq e ".tasks[$i].source" ./bauen.yaml)
    operation=$(yq e ".tasks[$i].operation" ./bauen.yaml)
    preserve_original=$(yq e ".tasks[$i].preserve_original" ./bauen.yaml)
    echo "-- i is $i"
    echo "-- target_location is $target_location"
    echo "-- source is $source"
    echo "-- operation is $operation"
    echo "-- preserve_original is $preserve_original"
    if [ "$preserve_original" == "true" ]; then
      backup_target $target_location
    fi
  done

  # create a symbolic link
}

backup_target() {
  target=$1
  unique="$(date -Iseconds | sed 's/[-:,]//g')_$(random_hash)"
  backup_location="$target.bak.$unique"
  ls $target
  echo "backup_target: $target -> $backup_location"
  if [ -d "$target" ]; then # || [ -f "$target" ]; then
    echo "---- moving $target -> $backup_location"
    # mv $target $backup_location
  fi
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

# ensure_available() {
#   source=$1
#   werkzeug=$source
#   if [[ "$source" == "git@"* ]] || [[ "$source" == "https://"* ]]; then
#     werkzeug=$(ensure_git $source)
#   elif [[ "$source" == "../"* ]] || [[ "$source" == "./"* ]] || [[ "$source" == "/"* ]]; then
#     werkzeug=$(ensure_local $source)
#   elif [[ "$source" == *"/"* ]]; then
#     werkzeug=$(ensure_git "git@github.com:$source")
#   else
#     echo_error "I don't understand this source: $source"
#     exit 1
#   fi
#   echo $werkzeug
# }

# ensure_local() {
#   werkzeug=$1
#   if [ ! -d $werkzeug ]; then
#     echo_error "$werkzeug not found"
#     exit 1
#   fi
#   echo $werkzeug
# }

# ensure_git() {
#   remote=$1
#   werkzeug="$(echo $remote | sed 's/.git$//' | rev | cut -d "/" -f 1 | rev)"
#   if [ ! -d "./werkzeuge/$werkzeug" ]; then
#     push ./werkzeuge
#     $bin_git clone $remote
#     pop
#   fi
#   echo "./werkzeuge/$werkzeug"
# }

git_status() {
  werkzeug=$1
  push $werkzeug
  git_status="$($bin_git status --porcelain)"
  if [ -z "$git_status" ]; then
    status="clean"
  else
    status="changes: $git_status"
  fi
  pop
  echo "$status"
}

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

random_hash() {
  length=$1
  length=$(if [ "$length" == "" ]; then echo 6; fi)
  echo "$(head /dev/urandom | md5sum | head -c $length)"
}
