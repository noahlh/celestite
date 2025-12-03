# Init
.EXPORT_ALL_VARIABLES:
.PHONY: development development_secure production build

# Variables
ROOT_DIR ?= $(abspath ../../)
ROOT_DIR_TRIMMED := $(patsubst %/,%,$(ROOT_DIR))

COMPONENT_DIR ?= $(abspath ./components)
COMPONENT_DIR_TRIMMED := $(patsubst %/,%,$(COMPONENT_DIR))

LAYOUT_DIR ?= $(abspath ./components/layouts)
LAYOUT_DIR_TRIMMED := $(patsubst %/,%,$(LAYOUT_DIR))

BUILD_DIR ?= $(abspath ./build)
BUILD_DIR_TRIMMED := $(patsubst %/,%,$(BUILD_DIR))

# Common environment for all targets
COMMON_ENV := NODE_ENV=$(NODE_ENV) NODE_PORT=$(NODE_PORT) VITE_PORT=$(VITE_PORT) DEV_SECURE=$(DEV_SECURE) ROOT_DIR=$(ROOT_DIR_TRIMMED) COMPONENT_DIR=$(COMPONENT_DIR_TRIMMED) LAYOUT_DIR=$(LAYOUT_DIR_TRIMMED) BUILD_DIR=$(BUILD_DIR_TRIMMED)

# Rules
development:
	$(COMMON_ENV) bun run vite-render-server.js

development_secure:
	$(COMMON_ENV) bun run vite-render-server.js

production:
	$(COMMON_ENV) bun run vite-render-server.js

# Build client and server bundles for production
build:
	cd $(ROOT_DIR_TRIMMED) && bunx --bun vite build --outDir $(BUILD_DIR_TRIMMED)/client
	cd $(ROOT_DIR_TRIMMED) && bunx --bun vite build --outDir $(BUILD_DIR_TRIMMED)/server --ssr $(COMPONENT_DIR_TRIMMED)



