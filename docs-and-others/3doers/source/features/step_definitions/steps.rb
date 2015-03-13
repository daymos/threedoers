Given(/^I have the page url$/) do
  @url = "/about.html"
end

When(/^I input the url in the browser bar$/) do
  visit @url
end

Then(/^I should see the page$/) do
  find('.headline').should have_content('We are based in Italy and work globally.')
end