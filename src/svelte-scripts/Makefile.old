# Init
.EXPORT_ALL_VARIABLES:
.PHONY: build production test development clean

# Paths
NODE_PATH := $(abspath ../../node_modules)
ROOT_PATH := $(abspath ../../)

# Variables
SAPPER_BUILD_DIR ?= $(abspath ./__sapper__/build)
SAPPER_BUILD_DIR_TRIMMED := $(patsubst %/,%,$(SAPPER_BUILD_DIR))

SAPPER_ROUTES ?= $(abspath ./)
# SAPPER_ROUTES_TRIMMED := $(patsubst %/,%,$(SAPPER_ROUTES))
SAPPER_ROUTES_TRIMMED := $(abspath $(SAPPER_ROUTES))

SAPPER_SRC ?= $(abspath ./)
SAPPER_SRC_TRIMMED := $(patsubst %/,%,$(SAPPER_SRC))

SAPPER_OUTPUT := $(abspath $(ROOT_PATH)/src/svelte-scripts/node_modules/@sapper)

SAPPER_SRC_FILES := $(wildcard *.js *.html)
SAPPER_ROUTE_FILES := $(wildcard $(SAPPER_ROUTES_TRIMMED)/*/*.js $(SAPPER_ROUTES_TRIMMED)/*/*.svelte)

# Rules
build: $(SAPPER_BUILD_DIR_TRIMMED)/.make.build

production test: build
	NODE_ENV=$(NODE_ENV) NODE_PATH=$(NODE_PATH) node $(SAPPER_BUILD_DIR_TRIMMED)

development:
	$(NODE_PATH)/sapper/sapper dev --no-hot -p $(NODE_PORT) --routes $(SAPPER_ROUTES_TRIMMED) --src $(ROOT_PATH)/src/svelte-scripts/ --output $(SAPPER_OUTPUT) --build-dir $(SAPPER_BUILD_DIR_TRIMMED)

$(SAPPER_BUILD_DIR_TRIMMED)/.make.build: $(SAPPER_SRC_FILES) $(SAPPER_ROUTE_FILES)
	$(NODE_PATH)/sapper/sapper build $(SAPPER_BUILD_DIR_TRIMMED) -p $(NODE_PORT) --routes $(SAPPER_ROUTES_TRIMMED) --src $(SAPPER_SRC_TRIMMED) --output $(SAPPER_OUTPUT)
	touch $(SAPPER_BUILD_DIR_TRIMMED)/.make.build

clean:
	rm -rf $(SAPPER_BUILD_DIR_TRIMMED)/.make.build

