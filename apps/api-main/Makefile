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
	docker buildx build \
	--push \
	--platform linux/amd64 \
	--build-arg STAGE=$(STAGE) \
	-t $(FULL_IMAGE_NAME) \
	-f $(abspath Dockerfile) $(abspath ../..)

all: build