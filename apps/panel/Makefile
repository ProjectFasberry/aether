ifneq (,$(wildcard ../../.env))
    include ../../.env
    export
endif

REGISTRY := $(REGISTRY_HOST)
PROJECT := $(REGISTRY_PROJECT)
IMAGE := $(REGISTRY_PANEL_IMAGE)
TAG = latest
FULL_IMAGE_NAME := $(REGISTRY)/$(PROJECT)/$(IMAGE):$(TAG)

build:
	docker build -t $(IMAGE):$(TAG) -f $(abspath Dockerfile) $(abspath ../..)

tag: build
	docker tag $(IMAGE):$(TAG) $(FULL_IMAGE_NAME)

push: tag
	docker push $(FULL_IMAGE_NAME)

all: push