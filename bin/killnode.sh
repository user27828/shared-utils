#!/bin/bash
# Murder instances of "node" which are not part of vscode or electron
# Note: This script uses 'bc' for precise sleep calculations. If 'bc' is not available, it falls back to 0.1 seconds.
# VS Code protection: Checks command lines, parent processes, working directories, and environment variables.
# Processes to exclude from killing
exclude_processes=("vscode" "Electron" "Android Studio" "Xcode" "cordova" "phonegap" "code" "code-server" "cursor")

# Additional VS Code related patterns to exclude
vscode_patterns=(
    ".vscode"
    "Microsoft VS Code"
    "Visual Studio Code"
    "extensions/ms-"
    "vscode-server"
    "remote-ssh"
    "languageserver"
    "typescript-language-server"
    "eslint-server"
    "copilot"
    "github.copilot"
    "/electron"
    "extensionHost"
)

# Maximum number of times to loop to murder instances
max_iterations=10

# Time to sleep between iterations (ms)
sleep_between_iterations=100

# PID of me
script_pid=$$

iteration=0

# Function to check if a process is VS Code related by examining parent process tree
is_vscode_related() {
    local pid=$1
    local current_pid=$pid
    local max_depth=5  # Limit depth to avoid infinite loops
    local depth=0
    
    while [ $depth -lt $max_depth ] && [ $current_pid -gt 1 ]; do
        # Get parent PID and command for current process
        local parent_info=$(ps -o ppid=,cmd= "$current_pid" 2>/dev/null)
        if [ -z "$parent_info" ]; then
            break
        fi
        
        local parent_pid=$(echo "$parent_info" | awk '{print $1}')
        local parent_cmd=$(echo "$parent_info" | cut -d' ' -f2-)
        
        # Check if parent command contains VS Code indicators
        for pattern in "${vscode_patterns[@]}"; do
            if [[ $parent_cmd == *"$pattern"* ]]; then
                return 0  # Found VS Code in parent tree
            fi
        done
        
        current_pid=$parent_pid
        depth=$((depth + 1))
    done
    
    return 1  # Not VS Code related
}

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
    # Find all node processes - simplified AWK logic to match processes with comm="node"
    node_pids=$(ps -eo pid,comm,cmd | awk '$2 == "node" {print $1}' | sort -n)
    
    # If no node processes found at all, exit early
    if [ -z "$node_pids" ]; then
        echo " - No Node processes found at all."
        break
    fi

    kill_pids=""

    # Filter out processes related to VS Code and the script itself
    for pid in $node_pids; do
      # Validate PID is numeric
      if ! [[ "$pid" =~ ^[0-9]+$ ]]; then
        continue
      fi
      
      # Immediately skip if it's the script's own PID
      if [[ $pid -eq $script_pid ]]; then 
        continue  
      fi
      
      # Check if process still exists and get command
      if ! cmd=$(ps -o cmd= "$pid" 2>/dev/null); then
        continue  # Process no longer exists
      fi

        # Skip if command is empty (process likely terminated)
        if [[ -z "$cmd" ]]; then 
            continue
        fi

      # Skip internal processes defined in exclude_processes
      skip=false
      for exclude_process in "${exclude_processes[@]}"; do
        if [[ $cmd =~ (^|[[:space:]/])$exclude_process([[:space:]/]|$) ]]; then
          skip=true
          break 
        fi
      done
      
      # Additional check for VS Code patterns
      if [ "$skip" = false ]; then
        for pattern in "${vscode_patterns[@]}"; do
          if [[ $cmd == *"$pattern"* ]]; then
            skip=true
            break
          fi
        done
      fi
      
      # Check if process is VS Code-related via parent process tree
      if [ "$skip" = false ] && is_vscode_related "$pid"; then
        echo " - Skipping PID $pid (VS Code related): $cmd"
        skip=true
      fi
      
      # Check if process is running from VS Code directories
      if [ "$skip" = false ]; then
        local process_cwd=$(pwdx "$pid" 2>/dev/null | cut -d: -f2- | xargs)
        if [[ -n "$process_cwd" ]] && [[ $process_cwd == *".vscode"* || $process_cwd == *"Visual Studio Code"* || $process_cwd == *"Microsoft VS Code"* ]]; then
          echo " - Skipping PID $pid (VS Code directory): $cmd"
          skip=true
        fi
      fi
      
      # Check environment variables for VS Code indicators
      if [ "$skip" = false ]; then
        local env_vars=$(tr '\0' '\n' < "/proc/$pid/environ" 2>/dev/null | grep -E "(VSCODE|ELECTRON|CODE_)" 2>/dev/null)
        if [[ -n "$env_vars" ]]; then
          echo " - Skipping PID $pid (VS Code environment): $cmd"
          skip=true
        fi
      fi

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
            if kill -9 $kill_pids 2>/dev/null; then
                echo " + Successfully sent SIGKILL to processes"
            else
                echo " + Warning: Some processes may have already terminated"
            fi
        else
            echo " + Murdering Node.js processes with PIDs: $kill_pids"
            if kill $kill_pids 2>/dev/null; then
                echo " + Successfully sent SIGTERM to processes"
            else
                echo " + Warning: Some processes may have already terminated"
            fi
        fi
    else
      echo " - No Node processes found to kill."
      break  # Exit the loop if no processes are found
    fi

    iteration=$((iteration + 1))
    if [ $iteration -lt $max_iterations ]; then
        # Fixed sleep calculation - convert milliseconds to seconds with decimal precision
        sleep_seconds=$(echo "scale=3; $sleep_between_iterations / 1000" | bc -l 2>/dev/null || echo "0.1")
        sleep "$sleep_seconds"
    fi

done