STAGE ?= dev
NAME ?= frontend-main

ROOT_ENV := ../../.env
ifneq (,$(wildcard $(ROOT_ENV)))
    include $(abspath $(ROOT_ENV))
endif

LOCAL_ENV := .env.local
ifneq (,$(wildcard $(LOCAL_ENV)))
    include $(abspath $(LOCAL_ENV))
endif

ifneq ($(ENV_FILES),)
    include $(firstword $(ENV_FILES))
    export
endif

export

REGISTRY := $(REGISTRY_HOST)
STAGE := $(STAGE)
NAME := $(NAME)
TAG = latest
FULL_IMAGE_NAME := $(REGISTRY)/$(STAGE)/$(NAME):$(TAG)

.PHONY: build tag push all

build:
	docker build \
	--platform linux/amd64 \
	--secret id=INFISICAL_ID,env=INFISICAL_CLIENT_ID \
	--secret id=INFISICAL_SECRET,env=INFISICAL_CLIENT_SECRET \
	--secret id=INFISICAL_PROJECT_ID,env=INFISICAL_PROJECT_ID \
	--secret id=INFISICAL_API_URL,env=INFISICAL_API_URL \
	--build-arg STAGE=$(STAGE) \
	-t $(NAME):$(TAG) -f $(abspath Dockerfile) $(abspath ../..)

tag: build
	docker tag $(NAME):$(TAG) $(FULL_IMAGE_NAME)

push: tag
	docker push $(FULL_IMAGE_NAME)

all: push