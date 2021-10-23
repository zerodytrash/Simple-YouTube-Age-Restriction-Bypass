module.exports = {
    'src/**/*.js': [
        'eslint --cache --fix',
        'prettier --write',
        'git add',
    ],
};
