activate :deploy do |deploy|
    deploy.method = :ftp
    deploy.host = "web332.webfaction.com"
    deploy.user = "piermaria"
    deploy.password = "Nonmelaricordo2"
    deploy.path = "/home/piermaria/webapps/thedoers"
    deploy.build_before = true
end

require 'builder'
activate :bower
activate :automatic_image_sizes

page "/", :layout => :html5
page "/indexoriginal.html", :layout => :html5
page "/comingsoon.html", :layout => :html5
page "/indexlogged_page.html", :layout => :html5
page "/thankyou_page.html", :layout => :html5
page "/registrationform_page.html", :layout => :html5
page "/loginform_page.html", :layout => :html5
page "/sendrequest_page.html", :layout => :html5
page "/uploadproject_page.html", :layout => :html5
page "/configurationform_page.html", :layout => :html5
page "/editprofile_page.html", :layout => :html5
page "/user-profile_page.html", :layout => :html5
page "/printer-profile_page.html", :layout => :html5
page "/printer-file_page.html", :layout => :html5
page "/filemanager-profile_page.html", :layout => :html5
page "/paymentalert-printer_page.html", :layout => :html5
page "/payment-printer_page.html", :layout => :html5
#page "/404.html", :layout => :html5
page "/sitemap.xml", :layout => false

require 'susy'

set :css_dir, 'css'
set :js_dir, 'js'
set :images_dir, 'images'
set :fonts_dir, 'fonts'


# Build-specific configuration
configure :build do
  # For example, change the Compass output style for deployment
  activate :minify_css
  
  # # Minify Javascript on build
  activate :minify_javascript
  activate :minify_html
  # # Create favicon/touch icon set from source/favicon_base.png
  activate :favicon_maker
  
  # # Enable cache buster
  activate :cache_buster
  #activate :image_optim
  
  # # Use relative URLs
  #activate :relative_assets
  # # To put width and height inside tag and to compression
  activate :gzip
  #activate :smusher


  # Or use a different image path
  #set :http_path, "http://3doers.it/"
end

#todo cambiare path sopra