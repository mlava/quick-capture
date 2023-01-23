Quick Capture for Roam Research allows you to use the power of Todoist as a quick capture gateway, and then import items into your Roam Research graph.

Email, voice assistant, apps - they all speak to Todoist. This integration works with both Free and Todoist Premium accounts.

Setup is fairly easy, but there are a lot of configuration options so you can achieve fine-grained control of your imports.

**NEW:**
1. Switch in settings to allow rename of Todoist labels if importing labels is selected. As Todoist doesn't allow spaces in label names, users usually use underscore (_). This switch will replace the _ with a space and wrap in #[[]] so that it works as a RR tag.

**IMPORTANT:**
A recent change in the Todoist API means that the way we define which label to download if you choose Label Mode must change. If you're using Label Mode, please place the label NAME in the settings at Todoist Label Name (optional) rather than the ID.

Recent features:
Automatic import of your Quick Capture items 
- turn on the switch in Roam Depot configuration settings and enjoy automatic sync of new items in your Todoist inbox. Items will be placed in the daily note page with the tag you configure within the settings. 

Define actions to take in Todoist after import
- select either Delete to delete the items from your Todoist inbox, Label to apply a label to the item in Todoist, or Nothing to take no action
- you can define the label to apply in the Roam Depot config settings

Import Todoist labels as Roam Research tags
- switch this on if you apply labels in Todoist and wish them to be imported with the item and converted to Roam Research tags

Combine automatic import with my Unread Badge extension to receive a visual prompt that there are new items for you to process!

For details of configuration options:
https://roamresearch.com/#/app/RoamScripts/page/ZMIPifeIp

Retrieve your Todoist API token:
  https://www.loom.com/share/d8e4d6d3c31c43aca3e2ba49914787c3
  
Retrieve your Todoist inbox id:
  https://www.loom.com/share/35816b92f0644c088f19c9bb471bd529

Trigger by opening Command Palette (CTRL-P) and then select 'Import Quick Capture items from Todoist'.
