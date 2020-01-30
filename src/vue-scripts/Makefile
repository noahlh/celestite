# Init
.EXPORT_ALL_VARIABLES:
.PHONY: build webpack development test production

# Variables
NODE_PATH := $(abspath ../../)
SOURCE_FILES := $(wildcard *.js *.vue)
VIEW_FILES := $(wildcard $(VUE_COMPONENT_DIR)/**/*)
VUE_ROUTES := $(abspath $(VUE_ROUTES_FILE))

# Rules
build: server-build/vue-server.js

webpack: build/.make.webpack

build/.make.webpack: $(SOURCE_FILES) $(VIEW_FILES) $(VUE_ROUTES)
	rm -rf build/ 
	npx webpack --config webpack/webpack-production-cfg.js
	touch build/.make.webpack

server-build/vue-server.js: vue-server.js
	npx babel --root-mode upward vue-server.js -d server-build	

development: build
	npx nodemon -e "json js" --exec node server-build/vue-server.js --watch server-build/

production test: build webpack
	node server-build/vue-server.js