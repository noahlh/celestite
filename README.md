![](https://github.com/noahlh/celestite/workflows/crystal%20spec/badge.svg?branch=master)

# celestite

<img src="https://crystal-lang.org/assets/media/crystal_icon.svg?sanitize=1" height=21> Crystal + <img src="https://upload.wikimedia.org/wikipedia/commons/1/1b/Svelte_Logo.svg" height=16> Svelte = :zap:

Celestite allows you to use the full power of [Svelte](https://svelte.dev) reactive components in your [Crystal](https://crystal-lang.org) web apps. It's a drop-in replacement for your view layer -- no more need for intermediate `.ecr` templates. With celestite, you write your backend server code in Crystal, your frontend client code in JavaScript & HTML, and everything works together seamlessly...and fast.

## Introduction

[Read the full introductory blog post here.](https://nlh.me/projects/celestite)

### Requirements

- Crystal 0.35.1+
- Yarn 1.12+
- Node 10+

The render server was built using node 10.15.3 (in particular it uses the WHATWG URL Standard, which was added in Node 7+.) It doesn't need to do this, strictly-speaking, and if there's a compelling reason to support earlier versions of Node I'm happy to make this change.)

## Installation

#### THIS IS PREVIEW / EARLY ALPHA SOFTWARE

**This is not much more than a proof-of-concept at the moment, but it does work! Standard warnings apply - it will likely break/crash in spectacular and ill-timed glory, so don't poke it, feed it past midnight, or use it for anything mission-critical (yet).**

Celestite has been developed / tested with the [Amber](https://amberframework.org) web framework, but designed to work standalone as well. There's also no reason it won't work with [Lucky](https://luckyframework.org/), [Kemal](http://kemalcr.com/), [Athena](https://athenaframework.org), etc. (but no work integrating with those has been done yet.) The steps below assume you'll be working with Amber.

### 1. Install Amber

Considering you have installed Crystal already.

#### MacOS

##### Homebrew
```
brew tap amberframework/amber
brew install amber
```
##### MacPorts
```
sudo port selfupdate
sudo port install amber
```

#### Ubuntu or Debian

##### From Source
```
sudo apt-get install libreadline-dev libsqlite3-dev libpq-dev libmysqlclient-dev libssl-dev libyaml-dev libpcre3-dev libevent-dev
curl -L https://github.com/amberframework/amber/archive/stable.tar.gz | tar xz
cd amber-stable/
shards install
make install
```
##### Linuxbrew
```
brew tap amberframework/amber
brew install amber
```

### 2. Setup Amber App

#### Create new app
```
amber new app-name
cd app-name
```
#### App Content
>`application_controller.cr` can be found in ./src/controllers

>`routes.cr` can be found in ./config/

>`index.svelte` and `_error.svelte` have to be added in ./src/views/

>Remove or hide `index.slang`,`application.slang` and `mailer.slang` because they break the build
```
.
├── bin
├── config
├── db
├── docker-compose.yml
├── Dockerfile
├── lib
├── package.json
├── public
├── README.md
├── shard.lock
├── shard.yml
├── spec
└── src

```
#### Build the app and run server
```
amber watch
```

### 3. Add celestite to your application's `shard.yml` and run `shards install`

```yaml
dependencies:
  celestite:
    github: noahlh/celestite
    version: ~> 0.1.3
```

### 4. Include the helper `Celestite::Adapter::Amber` in your `application_controller.cr`

This adds the `celestite_render` macro.

```crystal
  # application_controller.cr

  require "jasper_helpers"

  class ApplicationController < Amber::Controller::Base
    include JasperHelpers
+   include Celestite::Adapter::Amber
  end
```

### 5. Add `celestite_amber_init.cr` to `/config/initializers`

[An example](/config/celestite_amber_init.example.cr) is provided. You can name this file whatever you want, just so long as it gets called upon initialization.

### 4. Add an `_error.svelte` to your views directory

This is required for the time being because Sapper expects it. If it's missing, your app will still work, but there will be some weirdness with CSS rendering (trust me - this cost me an evening ;)

```html
<script>
  export let status;
  export let error;
</script>

<h1>{status}</h1>
<p>{error.message}</p>
```

### 4. Add a static route for your build_dir to Amber's static pipeline

This is because of a slight hitch with how Svelte works behind the scenes (via [Sapper](https://sapper.svelte.dev)), but essentially: the client needs to be able to access the relevant JS files in /client, yet Sapper needs complete control over that directory (it wipes it with each new build). So we simultaneously give it its own directory and also make it available via the root path.

```crystal
 # routes.cr

 pipeline :static do
   plug Amber::Pipe::Error.new
   plug Amber::Pipe::Static.new("./public")
+  plug Amber::Pipe::Static.new("./public/celestite")
 end
```

### And finally...

### 5. Add your `.svelte` files and start building!

A note on naming: make sure you follow Sapper's [file naming rules](https://sapper.svelte.dev/docs#File_naming_rules). Hint: the root component should be named `index.svelte` (all lowercase).

## Usage details

**`celestite_render`**`(context : Celestite::Context = nil, path : String? = nil, template : String? = nil)`

Performs the render. This is to be called where you'd normally call `render` in your controllers. It doesn't need any parameters by default (it automatically extracts the path of the method calling it based on your Amber routes), but you may use the following optional parameters:

- `context : Celestite::Context`

  Celestite uses a Hash literal called `Celestite::Context`. Any variables you'd like available in your components go in here, using a Symbol key of the desired name.

  So if you want to access `example_crystal_data` in your vue component, assign the relevant value to `my_context[:example_crystal_data]`. See example below for details

  This is acheived using Sapper's [session-seeding](https://sapper.svelte.dev/docs#Seeding_session_data) mechanism.

- `path : String?`

  If you need to manually specify which path you're rending (i.e. you're not in Amber), you can pass in a string parameter. In Amber this will be assigned a default value equal to the current Amber route the controller method is handling.

- `template : String?`

  **(Not implemented yet)** Which layout/template you'd like to render the component in. Will use a default template specified in the init file if none specified on render.

## Example controller

```crystal
# home_controller.cr

class HomeController < ApplicationController
  def index
    data = 1 + 1
    context = Celestite::Context{:data => data}
    celestite_render(context)
  end
end
```

## Server vs client rendering (Node/JavaScript)

Your `.svelte` components will automatically be rendered server-side before being sent to the client. This is usually seamless, but you'll need to be aware of any code (or libraries) that rely on browser-specific APIs (such as `document` or `window`). This will throw an error when the components are rendered in the context of node (vs the browser).

To get around this, you can import Sapper's `onMount()` function. Any function wrapped in `onMount()` will be rendered in the (browser) client only.

[You can read more about server-side rendering considerations here.](https://sapper.svelte.dev/docs#Server-side_rendering)

## Project status

My goal/philosophy is to release early, release often, and get as much user feedback as early in the process as possible, so even though the perfectionist in me would like to spend another 6 years improving this, by then it'll be 2024 and who knows we might all be living underwater. No time like the present.

## Roadmap

Short-term goals:

- [x] Release the embarrassing 0.1.0 version (originally supported Vue)
- [x] Fix reloading issues (not everything restarts properly)
- [x] Figure out Hot Module Reloading (HMR)
- [x] Add support for Svelte (released in 0.1.2)
- [ ] Get usage --> expose bugs
- [ ] Get example / demo project live
- [ ] Switch over to SveltKit when it's live

Longer-term goals:

- Performance & code cleanliness improvements
- Remove need for a separate node process / http (evaluate JS in crystal?)

## Contributions / critique wanted!

This has been a solo project of mine and I would love nothing more than to get feedback on the code / improvements / contributions. I've found by far the best way to learn and level-up development skills is to have others review code that you've wrestled with.

That is to say, don't hold back. Report things that are broken, help improve some of the code, or even just fix some typos. Everyone (at all skill levels) is welcome.

1. Fork it (<https://github.com/noahlh/celestite/fork>)
2. Create your feature/bugfix branch (`git checkout -b omg-this-fixed-so-many-bugs`)
3. Make magic (and don't forget to write tests!)
4. Commit your changes (`git commit -am 'Made a fix!'`)
5. Push to the branch (`git push origin omg-this-fixed-so-many-bugs`)
6. Create a new Pull Request
7. ::party::

## Contributors

- Noah Lehmann-Haupt (nlh@nlh.me / [noahlh](https://github.com/noahlh)) - creator, maintainer.
