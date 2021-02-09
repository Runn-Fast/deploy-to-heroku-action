# Github Action: Deploy to Heroku 

> A Github Action to deploy the Runn service to Heroku using docker images.

## Why?

Heroku has this great feature called "Review Apps". Whenever you create a new
Pull Request, it will automatically spin up a new app and deploy your code
there so you can try it out before merging the PR.

Heroku also supports deploying pre-built Docker images directly to it's
servers. However, by doing this you lose support for many of Heroku's other
features, including Review Apps.

This Github Action replicates the behaviour of Heroku Review Apps for docker
images. You can configure Github Actions to build a docker image for each new
Pull Request and this action will spin up a new environment and deploy that
image there.

This action will also check for any Pull Requests that have been closed or
merged and destroy any Heroku Apps that are no longer needed.

## Usage

You should really checkout how we use this Github Action in production.

See:
- [app.workflow.yml](https://github.com/Runn-Fast/runn/blob/development/.github/workflows/app.workflow.yml)
- [hasura.workflow.yml](https://github.com/Runn-Fast/runn/blob/development/.github/workflows/hasura.workflow.yml)

Quick example of how to configure all the inputs:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      BASE_DIR: ./services/hasura
    steps:
      # ...
      # checkout git repo
      # build docker image, etc
      # ...
      - name: Deploy To Heroku
        uses: Runn-Fast/deploy-to-heroku-action@1.0
        with:
          github_api_key: ${{ secrets.GITHUB_TOKEN }}
          heroku_api_key: ${{ secrets.HEROKU_API_KEY }}
          heroku_email: george@runn.io
          images: app_web, app_worker
          env_vars: |
            AWS_ACCESS_KEY_ID=${{ secrets.AWS_ACCESS_KEY_ID }}
            # ...
            HASURA_ADMIN_SECRET=${{ secrets.HASURA_ADMIN_SECRET }}
```

## Inputs

### `github_api_key`

This should always be set to `${{ secrets.GITHUB_TOKEN }}`. The `GITHUB_TOKEN`
is a special secret that gets injected by Github.

This API Key is only used to query the open Pull Requests.

### `heroku_api_key`

The Heroku API Key should be stored as a "Secret" the settings of your Github
Repo.

This API Key is used to:

- create and configure new applications
- push docker images to the Heroku Container Registry
- release existing applications
- destroy unused applications
- and more

### `heroku_email`

This is the email address that the Heroku API Key is for.

### `images`

This is a comma-separated list of docker images to push to Heroku.  The image
will be re-tagged to use the Heroku registry format.

The naming of each image is very important. It should be of the format
`${appName}_${processType}`. 

Supported app names:

- `app`
- `hasura`

Process type should either be `web` or `worker`.

### `env_vars`

This is a new-line separated list of environment variables to set on the main
application.

Important:

- Do not quote values
- Comments are NOT supported.
- Keys cannot include spaces

Example:

```yaml
env_vars: |
  KEY_1=value
  KEY_2=values can include spaces and "even" quotes
  KEY_3=${{ secrets.PRESET_SECRET }}
```

A special environment variable is the `HASURA_ADMIN_SECRET` which must be specified when
deploying Hasura - as it is used for the admin password.
