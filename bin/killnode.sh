#!/bin/bash
# Murder instances of "node" which are not part of vscode or electron
# Processes to exclude from killing
exclude_processes=("vscode" "Electron" "Android Studio" "Xcode", "cordova", "phonegap")

# Maximum number of times to loop to murder instances
max_iterations=10

# Time to sleep between iterations (ms)
sleep_between_iterations=100

# PID of me
script_pid=$$

iteration=0

usage() {
    echo "Usage: $0 [-9]"
    echo "  -9    Force kill processes using SIGKILL"
    exit 1
}

# Kill param handling
force_kill=false
while getopts "9" opt; do
    case $opt in
        9) force_kill=true ;;
        *) usage ;;
    esac
done

while [ $iteration -lt $max_iterations ]; do
    # Modified to only match exact 'node' process or 'node' with arguments
    node_pids=$(ps -eo pid,comm,cmd | awk '$2 == "node" || $2 == "node" && $3 ~ /^[^ ]*$/ {print $1}' | sort -n)

    kill_pids=""

    # Filter out processes related to VS Code and the script itself
    for pid in $node_pids; do
      # Immediately skip if it's the script's own PID
      if [[ $pid -eq $script_pid ]]; then 
        continue  
      fi
      
      cmd=$(ps -o cmd= $pid 2>/dev/null)

        # Skip if command is empty (process likely terminated)
        if [[ -z "$cmd" ]]; then 
            continue
        fi

      # Skip internal processes defined in exclude_processes
      skip=false
      for exclude_process in "${exclude_processes[@]}"; do
        if [[ $cmd == *"$exclude_process"* ]]; then
          skip=true
          break 
        fi
      done

      if $skip; then
        continue # Skip to the next PID
      fi

      # Print PID and command *only* if it will be killed
      echo "PID: $pid, Command: $cmd"

      # Add the PID to the list of processes to murder
      kill_pids="$kill_pids $pid"
    done


    # Kill all other Nodes
    if [ -n "$kill_pids" ]; then
        if $force_kill; then
            echo " + Force murdering Node.js processes with PIDs: $kill_pids"
            kill -9 $kill_pids
        else
            echo " + Murdering Node.js processes with PIDs: $kill_pids"
            kill $kill_pids
        fi
    else
      echo " - No Node processes found to kill."
      break  # Exit the loop if no processes are found
    fi

    iteration=$((iteration + 1))
    if [ $iteration -lt $max_iterations ]; then
        sleep $((sleep_between_iterations / 1000)) # Sleep is in seconds
    fi

done