#!/bin/bash
# Murder instances of "node" which are not part of vscode or electron
# Note: This script uses 'bc' for precise sleep calculations. If 'bc' is not available, it falls back to 0.1 seconds.
# VS Code protection: Checks command lines, parent processes, working directories, and environment variables.

# Graceful shutdown on signals
trap 'echo "Script interrupted, exiting safely" >&2; exit 0' INT TERM

# Validate all critical commands exist before proceeding
for cmd in ps awk cut grep tr kill sleep; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        echo "CRITICAL: Required command '$cmd' not found" >&2
        exit 1
    fi
done
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
        
        # Validate parent_pid is numeric to prevent infinite loops
        if ! [[ "$parent_pid" =~ ^[0-9]+$ ]]; then
            break
        fi
        
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
    # Find all node processes - ONLY match actual node executables for safety
    # Removed broad pattern matching to prevent false positives 
    node_pids=$(ps -eo pid,comm,cmd | awk '$2 == "node" {print $1}' | sort -n)
    
    # Validate ps command succeeded and produced reasonable output
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to execute ps command, aborting for safety" >&2
        exit 1
    fi
    
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
            # Escape regex metacharacters to prevent injection attacks
            exclude_process_escaped=$(printf '%s\n' "$exclude_process" | sed 's/[[\.*^$()+?{|]/\\&/g')
            if [[ $cmd =~ (^|[[:space:]/])$exclude_process_escaped([[:space:]/]|$) ]]; then
                skip=true
                break 
            fi
        done
      
        # Additional check for VS Code patterns
        if [ "$skip" = false ]; then
            for pattern in "${vscode_patterns[@]}"; do
                if [[ $cmd == *"$pattern"* ]]; then
                    echo " - Skipping PID $pid (VS Code pattern '$pattern'): $cmd"
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
            if command -v pwdx >/dev/null 2>&1; then
                process_cwd=$(pwdx "$pid" 2>/dev/null | cut -d: -f2- | xargs)
                if [[ -n "$process_cwd" ]] && [[ $process_cwd == *".vscode"* || $process_cwd == *"Visual Studio Code"* || $process_cwd == *"Microsoft VS Code"* ]]; then
                    echo " - Skipping PID $pid (VS Code directory): $cmd"
                    skip=true
                fi
            fi
        fi
        
        # Check environment variables for VS Code indicators
        if [ "$skip" = false ]; then
            # Limit memory consumption and add timeout for safety
            env_vars=$(timeout 5s head -c 1048576 "/proc/$pid/environ" 2>/dev/null | tr '\0' '\n' | grep -E "(VSCODE|ELECTRON|CODE_)" 2>/dev/null)
            if [[ -n "$env_vars" ]]; then
                echo " - Skipping PID $pid (VS Code environment): $cmd"
                skip=true
            fi
        fi

        if $skip; then
            continue # Skip to the next PID
        fi

        # ATOMIC VERIFICATION: Double-check process is still a node process immediately before kill
        # This prevents race conditions where process changes between detection and killing
        current_comm=$(ps -o comm= "$pid" 2>/dev/null)
        if [[ "$current_comm" != "node" ]]; then
            echo " - Skipping PID $pid (no longer a node process): $cmd"
            continue
        fi

        # Print PID and command *only* if it will be killed
        echo "PID: $pid, Command: $cmd"

        # Add the PID to the list of processes to murder
        kill_pids="$kill_pids $pid"
    done


    # Kill all other Nodes with individual verification
    if [ -n "$kill_pids" ]; then
        successful_kills=""
        failed_kills=""
        
        # Kill processes individually to track success/failure
        for pid in $kill_pids; do
            # Final atomic check before kill
            if [[ "$(ps -o comm= "$pid" 2>/dev/null)" == "node" ]]; then
                if $force_kill; then
                    if kill -9 "$pid" 2>/dev/null; then
                        successful_kills="$successful_kills $pid"
                    else
                        failed_kills="$failed_kills $pid"
                    fi
                else
                    if kill "$pid" 2>/dev/null; then
                        successful_kills="$successful_kills $pid"
                    else
                        failed_kills="$failed_kills $pid"
                    fi
                fi
            else
                echo " - PID $pid no longer a node process, skipping"
            fi
        done
        
        # Report results
        if [ -n "$successful_kills" ]; then
            if $force_kill; then
                echo " + Successfully sent SIGKILL to PIDs:$successful_kills"
            else
                echo " + Successfully sent SIGTERM to PIDs:$successful_kills"
            fi
        fi
        
        if [ -n "$failed_kills" ]; then
            echo " + Failed to kill PIDs:$failed_kills (processes may have already terminated)"
        fi
    else
        echo " - No Node processes found to kill."
        break  # Exit the loop if no processes are found
    fi

    iteration=$((iteration + 1))
    if [ $iteration -lt $max_iterations ]; then
        # Enhanced sleep calculation with better error handling
        if command -v bc >/dev/null 2>&1; then
            sleep_seconds=$(echo "scale=3; $sleep_between_iterations / 1000" | bc -l 2>/dev/null)
            # Validate bc output is numeric and reasonable
            if ! [[ "$sleep_seconds" =~ ^[0-9]*\.?[0-9]+$ ]] || (( $(echo "$sleep_seconds > 1" | bc -l 2>/dev/null || echo 0) )); then
                sleep_seconds="0.1"
            fi
        else
            sleep_seconds="0.1"
        fi
        
        # Validate sleep command supports decimal values (fallback to integer)
        if ! sleep "$sleep_seconds" 2>/dev/null; then
            sleep 1
        fi
    fi

done