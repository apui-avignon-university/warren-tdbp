# Deploy Warren-TdBP with Docker Swarm

## Prerequisites

Before proceeding with the deployment of Warren-TdBP, ensure that you have Docker Engine
installed and configured with Swarm mode: [Docker
Engine](https://docs.docker.com/engine/install/).

## Tutorial

This tutorial provides a step-to-step guide to deploying Warren-TdBP on a local Docker
Engine cluster in swarm mode. By following this tutorial, you will:

- set up a small cluster consisting of one manager node on your local machine,
- deploy Warren TdBP using the production Compose file.

> ⚠️ Caution! In this tutorial:
> - We are setting up a cluster with only one manager node and no workers. For a more
>   reliable setup in a real-world scenario, it's recommended to create a cluster with
>   one manager node and multiple worker nodes (refer to the Docker
>   [documentation](https://docs.docker.com/engine/swarm/how-swarm-mode-works/nodes/)).

> - We are deploying a Postgresql database to the cluster on a single node, which will
>   be used by both the api and the app, without any replicas. It's generally
>   recommended to avoid running databases (or any stateful service) directly on the
>   cluster to prevent potential data loss. On a side note, if deploying the database on
>   the cluster is necessary, it should be done with replication in mind for better
>   safety.

### Initializing the cluster

Initialize a local cluster using the following command:
```bash
docker swarm init
```

To view the current state of the swarm, use:
```bash
docker info
```

For informations about nodes in the swarm, execute:
```bash
docker node ls
```

> 💡 Tip 
> If you want to add more nodes to the cluster, refer to this
> [documentation](https://docs.docker.com/engine/swarm/swarm-tutorial/add-nodes/).

### Creating Volumes

Warren-TdBP requires a PostgreSQL database for persistency, along with volumes for
static and media files used by the `app` service.

Create the necessary volumes using the following commands:
```bash
docker volume create postgres_data
docker volume create media
docker volume create static
```

We can check that all volumes have been created with the command:
```bash
docker volume ls
```

> For additional volume creation options (e.g. size, file system, device), refer to the
> [documentation](https://docs.docker.com/engine/reference/commandline/volume_create/).

### Creating Logging

Adjust services' logging configuration by creating a new`config` object from the
project's sources:

```bash
docker config create logging_config src/api/logging-config.prod.yaml
```

This command creates a new config named `logging_config` from the content of
`src/api/logging-config.prod.yaml`. This config is mounted under the `/app/core/`
directory of the `api` service during the deployment.

### Creating the Network

To enable service-to-service communication, create an overlay network and attach
services to it. In the `docker-compose.prod.yml` file, all services are connected to
the `backend` network, which needs to be created:
```bash
docker network create -d overlay --attachable backend
```

Ensure Warren-TdBP API is connected to a Ralph instance for fetching statements. If
using Docker Swarm to deploy Ralph, make sure both services are running on the same
`backend` network.

### Configuring the indexer cronjob

To understand the activities of a course, the Experience Index stores the relationships
between each activity within a course. We propose using a cronjob to index courses and
their content at scheduled times. This cronjob will index all courses and contents in
the target LMS. You can update the cronjob schedule or change the CLI indexer command to
index specific courses as needed.

In this deployment, we use [swarm-cronjob](https://github.com/crazy-max/swarm-cronjob)
to operate cronjobs. Time schedules are set through labels, which you can modify before
deploying the stack, or change on a running stack with the command:

```bash
docker service update tdbp_indexer-cronjob --label-add "swarm.cronjob.schedule=55 15 * * *"
```

To check the logs of execution of the cronjob once the stack is deployed, use the
command:
```bash
docker service logs -f tdbp_indexer-cronjob
```

### Configuring Moodle web services for XI indexation 

In order for the Experience Index to access the Moodle courses and their content, we
need to configure a web service under `Moodle > Web services` and following the 10 steps
provided by Moodle:
1. Enable web service: `Yes`
2. Enable protocols: `rest`
3. Create a specific user: `warren_tdbp`
4. Check its user capability
5. Select a service: add a new service (let's name it `Warren-TdBP - XI`) 
6. Add functions: new service `Warren-TdBP - XI` needs to have the following functions:
- `core_course_get_courses` to get course details.
- `core_course_get_contents` to get course contents.
7. Select a specific user: select the user previously created `warren_tdbp`
8. Create a token for a user: create a token for user `warren_tdbp`

We should now have a web service token for accessing our Moodle courses and their
content. This token should be set in the environment variable `WARREN_XI_LMS_API_TOKEN`.
Don't forget to also set the variable `WARREN_XI_LMS_BASE_URL` with your Moodle instance
URL.

### Deploying Warren-TdBP

Docker Engine in swarm mode can deploy services defined in a Compose file. Deploy the
following services defined in `docker-compose.prod.yml`: `postgresql`, `api` and `app`. 

Adjust the `docker-compose.prod.yml` file and the environment files (`postgresql.env`,
`api.env` and `app.env`) as per your requirements, including Warren's docker image tags

Once ready, deploy the service using the command: 
```bash
docker stack deploy tdbp --compose-file production/docker-compose.prod.yml --with-registry-auth
```

Check if the services are up and running with:
```bash
docker service ls
```

View all the running containers with:
```bash
docker ps
```

If a service is not started, we can investigate further with:
```bash
docker service ps --no-trunc SERVICE_NAME
```

For investigating further in case a service is not healthy, use:
```bash
docker inspect --format "{{json .State.Health }}" CONTAINER_ID | jq
```
_Note_: this command requires that [jq](https://jqlang.github.io/jq/) is installed
on your operating system.

We can check logs of a container directly with the command:
```
docker logs CONTAINER_ID
```

### Migrating the databases

Two databases (`POSTGRES_API_DB` and `POSTGRES_APP_DB`, defined in the `postgresql.env`)
are required on the `postgresql` instance. In this tutorial, they are both created (if
they don't exist) during container initialization with the `init.sh` file. 

To migrate these databases, you can use the commands:
- for the API:
```
docker exec -it <API_CONTAINER_ID> warren migration upgrade head
```
- for the APP:
```
docker exec -it <APP_CONTAINER_ID> python manage.py migrate
```

### Exposing Warren-TdBP with Caddy

To make Warren-TdBP accessible to an external Learning Management System (LMS), we will
utilize [Caddy](https://caddyserver.com/docs/install) as a reverse proxy. While Caddy
can be launched via its CLI, we strongly recommend employing a service manager for
automatic restarts (refer to the [documentation](https://caddyserver.com/docs/running)).

Begin by creating a Caddyfile which contains your configuration:
```
app.example.com {
reverse_proxy :8000
}

api.example.com {
reverse_proxy:8100
}
```

_Note_: Adapt the Caddyfile to match your needs, pointing to your SSL certificate if your
instance of Moodle only accepts HTTPS connections.

Launch Caddy from the directory containing the Caddyfile with the command:
```bash
caddy start
```

Caddy is now operational, directing traffic to your pods.

### Configuring Warren-TdBP for LTI integration

With Warren-TdBP running, let's configure it as an external LTI tool within our chosen
LMS. Start by creating an admin account on the Warren-TdBP app using:
```bash
docker exec -it $(docker ps -q -f name=tdbp_app) python manage.py createsuperuser
```

Access the `app` admin page at `http://localhost:8000/admin`.

Next, add an LTI consumers for Moodle, by providing the Moodle site URL. Add an LTI
passport for this newly created Moodle consumer. An Oauth consumer key and a shared
secret will be generated on save.

### Adding Warren-TdBP as an external tool in Moodle

Now that we have our LTI passport, log into the Moodle admin site and add an external
tool by following this
[documentation](https://docs.moodle.org/403/en/LTI_External_tools).

- LTI tool URL: `https://app.example.com`
- LTI version: `LTI 1.1`
- Supports Deep linking: Enabled
- Content Selection URL: `https://app.example.com/lti/select`
- Share launcher's name with tool: Always
- Share launcher's email with tool: Always
- Default launch container: Existing window

You can now create a new activity from the Warren-TdBP tool inside a course!

> Note: The "ID number" of the users need to be filled, as it is required by Warren-TdBP
> to authenticate.
