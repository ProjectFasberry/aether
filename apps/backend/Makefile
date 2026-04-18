STAGE ?= dev
NAME ?= api-main

ifneq (,$(wildcard ../../.env))
    include ../../.env
    export
endif

export

REGISTRY := $(REGISTRY_HOST)
STAGE := $(STAGE)
NAME := $(NAME)
TAG = latest
FULL_IMAGE_NAME := $(REGISTRY)/$(STAGE)/$(NAME):$(TAG)

build:
	docker build \
	--platform linux/amd64 \
	--build-arg STAGE=$(STAGE) \
	-t $(NAME):$(TAG) -f $(abspath Dockerfile) $(abspath ../..)

tag: build
	docker tag $(NAME):$(TAG) $(FULL_IMAGE_NAME)

push: tag
	docker push $(FULL_IMAGE_NAME)

all: push