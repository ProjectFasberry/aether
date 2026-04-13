ifneq (,$(wildcard ../../.env))
    include ../../.env
    export
endif

REGISTRY := $(REGISTRY_HOST)
PROJECT := $(REGISTRY_PROJECT)
IMAGE := $(REGISTRY_APP_IMAGE)
TAG = latest
FULL_IMAGE_NAME := $(REGISTRY)/$(PROJECT)/$(IMAGE):$(TAG)

.PHONY: build tag push all

build:
	docker build \
	--platform linux/amd64 \
	--build-arg INFISICAL_CLIENT_ID="$${INFISICAL_CLIENT_ID}" \
	--build-arg INFISICAL_CLIENT_SECRET="$${INFISICAL_CLIENT_SECRET}" \
	--build-arg INFISICAL_PROJECT_ID="$${INFISICAL_PROJECT_ID}" \
	--build-arg INFISICAL_API_URL="$${INFISICAL_API_URL}" \
	-t $(IMAGE):$(TAG) -f $(abspath Dockerfile) $(abspath ../..)

tag: build
	docker tag $(IMAGE):$(TAG) $(FULL_IMAGE_NAME)

push: tag
	docker push $(FULL_IMAGE_NAME)

all: push