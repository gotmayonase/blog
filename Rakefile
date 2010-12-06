require 'rubygems'
require 'net/ssh'

desc 'update site from remote repo'
task :update do

 user = 'gotmayonase'
 repo = 'blog'

 Net::SSH.start('mikemayo.org', 'mike') do |ssh|
   ssh.exec(
    "rm -rf #{repo} && " <<
    "git clone -q git://github.com/#{user}/#{repo}.git && " <<
    "jekyll #{repo} _new_site --pygments && " <<
    "rm -rf _site && " <<
    "mv _new_site _site")
  end
end