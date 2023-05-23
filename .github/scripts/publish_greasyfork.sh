#!/bin/bash

set -eu

AUTH_TOKEN=""

COOKIE_FILE_PATH="/tmp/cookies.txt"

BASE_URL="https://greasyfork.org"
# "/en/search" appears to be the lightest
INITIAL_PAGE_PATH="/en/search"

LOGIN_URL="$BASE_URL/en/users/sign_in?return_to=$INITIAL_PAGE_PATH"
UPDATE_URL="$BASE_URL/en/scripts/$GREASYFORK_SCRIPT_ID/versions"
INITIAL_URL="$BASE_URL$INITIAL_PAGE_PATH"

case $GREASYFORK_SCRIPT_TYPE in
    "public") GREASYFORK_SCRIPT_TYPE=1 ;;
    "unlisted") GREASYFORK_SCRIPT_TYPE=2 ;;
    "library") GREASYFORK_SCRIPT_TYPE=3 ;;
esac

request() {
    curl -fsSL -b "$COOKIE_FILE_PATH" -c "$COOKIE_FILE_PATH" "$@"
}

extract_auth_token() {
    awk -F '"' '/name="csrf-token"/{print $4}' <<< "$@"
}

cleanup() {
    rm -f "$COOKIE_FILE_PATH"
}

trap cleanup EXIT

# Get initial page to retrieve the initial auth token
INITIAL_RESPONSE="$(request "$INITIAL_URL")"
AUTH_TOKEN="$(extract_auth_token "$INITIAL_RESPONSE")"

# Log in to retrieve the final login auth token
LOGIN_RESPONSE="$(request \
    -d "authenticity_token=$AUTH_TOKEN" \
    -d "user[email]=$GREASYFORK_USER_EMAIL" \
    -d "user[password]=$GREASYFORK_USER_PASS" \
    -d "user[remember_me]=0" \
    -d "commit=Log in" \
    "$LOGIN_URL")"

# Check if login was successful
if [[ "$LOGIN_RESPONSE" != *"sign-out-link"* ]]; then
    echo -e "\e[38;2;103;103;103m$LOGIN_RESPONSE\e[0m\n"
    echo -e "\e[1;31mFailed: Sign in\e[0m - Unknown reason"
    exit 1
fi

# Extract updated authenticity token after successful login
AUTH_TOKEN="$(extract_auth_token "$LOGIN_RESPONSE")"

# Update the script
SCRIPT_FILE_PATH="$(find . -iwholename "$SCRIPT_FILE_PATH" -print -quit)"
SCRIPT_UPDATE_RESPONSE="$(request \
    -F "authenticity_token=$AUTH_TOKEN" \
    -F "script_version[code]=" \
    -F "code_upload=@$SCRIPT_FILE_PATH" \
    -F "script_version[attachments][]=" \
    -F "script_version[attachments][]=; filename=\"\"" \
    -F "script_version[additional_info][0][attribute_default]=true" \
    -F "script_version[additional_info][0][value_markup]=html" \
    -F "script_version[additional_info][0][attribute_value]=" \
    -F "script_version[changelog_markup]=html" \
    -F "script_version[changelog]=" \
    -F "script[script_type_id]=$GREASYFORK_SCRIPT_TYPE" \
    -F "script[adult_content_self_report]=0" \
    -F "commit=Post new version" \
    "$UPDATE_URL")"

# Check if the script update was successful
if [[ "$SCRIPT_UPDATE_RESPONSE" != *"id=\"install-area\""* ]]; then
    echo -e "\e[38;2;103;103;103m$SCRIPT_UPDATE_RESPONSE\e[0m\n"
    if [[ "$SCRIPT_UPDATE_RESPONSE" == *"validation-errors"* ]]; then
        echo -e "\e[1;31mFailed: Publish to GreasyFork\e[0m - Validation errors were reported"
    else
        echo -e "\e[1;31mFailed: Publish to GreasyFork\e[0m - Unknown reason"
    fi
    exit 1
fi
