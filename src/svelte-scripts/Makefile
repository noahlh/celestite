# Init
.EXPORT_ALL_VARIABLES:
.PHONY: development

# Paths
NODE_PATH := $(abspath ../../node_modules)

# Variables
ROOT_DIR ?= $(abspath ../../)
ROOT_DIR_TRIMMED := $(patsubst %/,%,$(ROOT_DIR))

COMPONENT_DIR ?= $(abspath ./components)
COMPONENT_DIR_TRIMMED := $(patsubst %/,%,$(COMPONENT_DIR))

LAYOUT_DIR ?= $(abspath ./components/layouts)
LAYOUT_DIR_TRIMMED := $(patsubst %/,%,$(LAYOUT_DIR))

BUILD_DIR ?= $(abspath ./build)
BUILD_DIR_TRIMMED := $(patsubst %/,%,$(BUILD_DIR))

SRC_FILES := $(wildcard *.js *.html)
COMPONENT_FILES := $(wildcard $(COMPONENT_DIR_TRIMMED)/*/*.js $(COMPONENT_DIR_TRIMMED)/*/*.svelte)

# Rules
development:
	NODE_PATH=$(NODE_PATH) NODE_ENV=$(NODE_ENV) NODE_PORT=$(NODE_PORT) ROOT_DIR=$(ROOT_DIR_TRIMMED) COMPONENT_DIR=$(COMPONENT_DIR_TRIMMED) LAYOUT_DIR=$(LAYOUT_DIR_TRIMMED) BUILD_DIR=$(BUILD_DIR_TRIMMED) node svelte-render-server

production:
	NODE_PATH=$(NODE_PATH) NODE_ENV=$(NODE_ENV) NODE_PORT=$(NODE_PORT) ROOT_DIR=$(ROOT_DIR_TRIMMED) COMPONENT_DIR=$(COMPONENT_DIR_TRIMMED) LAYOUT_DIR=$(LAYOUT_DIR_TRIMMED) BUILD_DIR=$(BUILD_DIR_TRIMMED) node svelte-render-server



