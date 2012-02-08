require 'bundler'
Bundler.require(:default, :production) if defined?(Bundler)

run Rack::Jekyll.new