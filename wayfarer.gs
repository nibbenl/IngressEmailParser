function myFunction()
{
  process_wayfarer_emails();
}

/**************************************************************************************
** @brief Run the parser for the emails!
**************************************************************************************/
function process_wayfarer_emails() {
  var user_info = GmailApp.getInboxThreads(0,1)[0];
  var user_info_message = user_info.getMessages()[0];
  var user_running = user_info_message.getHeader("to");
  var label = GmailApp.getUserLabelByName("Ingress-Notifications");
  var doneLabel = GmailApp.getUserLabelByName("Ingress-Processed");
  Logger.log("Running Ingress Wayfarer Parser for " + user_running);
  var threads = label.getThreads(0, 30);
  var ret_val = false;

  if (threads.length != 0)
  {
    for (var i=0; i<threads.length; i++)
    {
      var message_thread = threads[i];
      var messages = threads[i].getMessages();
      Logger.log("Running parser for : " + messages.length + " messages, max 30 messages");
      for (var j=0; j<messages.length; j++)
      {        
        var msg = messages[j].getPlainBody();
        var test = messages[j].getRawContent();
        var msgHTML = messages[j].getBody();
        var msgHTMLSplit = msgHTML.split("\n");
        var cleanBodyText = msg.replace(/<\/?[^>]+(>|$)/g, "");
        var sub = messages[j].getSubject();
        var dat = messages[j].getDate();
        var whoTo = messages[j].getTo();
        
        Logger.log("Running Parser for : " + whoTo + " on message: " + sub);
        
        if ( sub.search("Fwd:") != -1 )
        {
          break;
        }
        //var v = sub.search("nomination received");
        if( sub.search("nomination received") != -1 )
        {
          /* nomination email from new system */
          ret_val = process_nomination_email( msgHTMLSplit, whoTo );

        }
        else if ( sub.search("nomination decided") != -1 )
        {
          /* nomination decision email */
          ret_val = process_descision_email( msgHTMLSplit, whoTo );
        }
        else if ( sub.search("edit suggestion received") != -1 )
        {
          ret_val = process_edit_email( msgHTMLSplit, whoTo );
        }
        else if ( sub.search("edit suggestion decided") != -1 )
        {
          ret_val = process_edit_decision_email( msgHTMLSplit, whoTo );
        }
        else if ( sub.search("Photo received") != -1 )
        {
          ret_val = process_photo_email( msgHTMLSplit, whoTo );
        }
        else if ( sub.search("Niantic Wayspot media submission decided") != -1 )
        {
          ret_val = process_photo_decision_email( msgHTMLSplit, whoTo );
        }
        else if ( sub.search("report received") != -1 )
        {
          ret_val = process_report_email( msgHTMLSplit, whoTo );
        }
        else if ( sub.search("Niantic Wayspot report decided") != -1 )
        {
          ret_val = process_report_decision_email( msgHTMLSplit, whoTo );
        }
        else if ( sub.search("Ingress Mission Submission Received") != -1)
        {
          ret_val = mission_submission_parser( sub, whoTo);
        }
        else if ( sub.search("Ingress Mission Approved") != -1)
        {
          ret_val = mission_approval_parser( sub, whoTo);
        }
        else if ( sub.search("Ingress Mission Rejected") != -1)
        {
          ret_val = mission_rejection_parser( sub, whoTo, msgHTMLSplit);
        }
        else if (sub.search("Wayspot appeal received") != -1)
        {
          ret_val = appeal_submitted( msgHTMLSplit, whoTo);
        }
        else if (sub.search("Wayspot appeal has been decided") != -1)
        {
          ret_val = appeal_decided( msgHTMLSplit, whoTo );
        }
        else if (sub.search("Your Wayspot submission for") != -1 )
        {
          ret_val = process_descision_email_wayfarer_submitted( sub, whoTo );
        }
        /* Move the Processed Data */
        if( ret_val ){
          move_thread( message_thread, label, doneLabel );
        } else {
          Logger.log("Not Moving, error detected.");
        }

      }
    }
  }
}

/**************************************************************************************
** @brief Move a tread label from notifications to processed
**************************************************************************************/
function move_thread(t, l1, l2) {
  Logger.log("Moving " + t);
  t.removeLabel(l1);
  t.addLabel(l2);
}

/**************************************************************************************
** @brief Process a decision email.
** @param html_data - The HTML split of the message.
** @param emailAddr - who recvd the email
**************************************************************************************/
function process_descision_email( html_data, emailAddr )
{
  var discord_dict = get_blank_discord_dict();
  discord_dict["who"] = emailAddr;
  
  Logger.log(html_data[236]);
  var resulting_text = html_data[240];
  var v = resulting_text.search("Congratulations");
  if (resulting_text.search("Congratulations") != -1)
  {
    discord_dict["result"] = "__Portal Accepted__";
    discord_dict["color"] = 0x57f717;
  } else 
  {
    discord_dict["result"] = "__Portal Denied__";
    discord_dict["color"] = 0xf71717;
  }
  // Title Text
  var result_text = html_data[236].trim().replace(/<[^>]*>/g, "");
  result_text = result_text.replace("Thank you for your Wayspot nomination", '').trim();
  var title_text = result_text.substr(0,result_text.search(" on "));
  var date_str = result_text.substr(result_text.search(" on ")+4,40).replace('!','');
  discord_dict["title"] = title_text;
  discord_dict["desc"] = " \nSubmitted on: " + date_str;
  Logger.log(result_text);
  return post_wayfarer_email_to_discord(discord_dict);
}

/**************************************************************************************
** @brief Process a nomination email.
** @param html_data - The HTML split of the message.
** @param emailAddr - who recvd the email
**************************************************************************************/
function process_nomination_email( html_data, emailAddr )
{
  var discord_dict = get_blank_discord_dict();
  var images_text = html_data[242];
  var images_split = images_text.split('<');
  var i_split1 = images_split[2].split('=');
  var i_split2 = images_split[5].split('=');
  // "http://lh3.googleusercontent.com/gEEvKxFZUAScWB2aDA7nY03c6Sv41PBwBgKVzjDPExSlrZSO9OvrhcKX2CAz-3eLfYZjcAGi0_108-dKqmyfM9d5sjUB2S6ppj9OSLdDTw alt"
  var sub_photo = i_split1[1].replace(/ alt/g, "");
  var sup_photo = i_split2[1].replace(/ alt/g, "");
  var location_text_0 = html_data[243];
  location_text_0 = location_text_0.replace(/ /g, "");
  location_text_0 = location_text_0.replace('(', "");
  location_text_0 = location_text_0.replace(')', "");
  location_text_0 = location_text_0.replace("<br/> ", "");
  location_text_1 = location_text_0.split("<");
  var location_text = location_text_1[0].split(',');
  // (IIFFFFFF , -IIFFFFFF)
  // THIS ONLY WORKS FOR MY AREA.
  var lat_int = location_text[0].substr(0,2);
  var lat_frac = location_text[0].substr(2);
  var latitude = lat_int + "." + lat_frac
  var lng_int = location_text[1].substr(0,3);
  var lng_frac = location_text[1].substr(3);
  var longitude = lng_int + "." + lng_frac

  var nomination_title = html_data[239].trim().replace("<br/>", "").trim();
  var nomination_desc = html_data[240].replace("<br/>", "").trim();
  discord_dict = {
    "sub_photo" : sub_photo,
    "sup_photo" : sup_photo,
    "location" : "https://intel.ingress.com/?pll=" + latitude + ',' + longitude,
    "google" : "https://maps.google.com/?q=" + latitude + ',' + longitude,
    "title" : nomination_title,
    "desc" : nomination_desc,
    "result" : "Portal Submitted ",
    "who" : emailAddr,
    "color" : 0x124C93
  };
  return post_wayfarer_email_to_discord(discord_dict);
}

function process_report_email( html_data, emailAddr )
{
  Logger.log("Process Report");
  var discord_dict = get_blank_discord_dict();
  discord_dict["who"] = emailAddr;
  var what_subbed_text = html_data[239].trim();
  what_subbed_text = what_subbed_text.replace("<br/>", '');
  var split = what_subbed_text.split(":");
  discord_dict["result"] = "__Portal Report Submitted__";
  discord_dict["title"] = split[0];
  discord_dict["desc"] = "Invaid Portal\nReason: " + split[1].trim();
  discord_dict["color"] = 0xeb34dc;
  return post_wayfarer_email_to_discord(discord_dict);
}

function process_report_decision_email( html_data, emailAddr )
{
  Logger.log("Process Report Decision");
  var discord_dict = get_blank_discord_dict();
  discord_dict["who"] = emailAddr;
  if ( html_data[240].search("report will be accepted") != -1 )
  {
    discord_dict["result"] = "__Portal Report Accepted__";
    discord_dict["color"] = 0x57f717; 
  } else 
  {
    discord_dict["result"] = "__Portal Report Denied__";
    discord_dict["color"] = 0xf71717; 
  }
  var t = html_data[240].split("<br/>");
  var result_text = t[0].replace(" Thank you for your Wayspot report for ", '').trim();
  var title_text = result_text.substr(0,result_text.search(" on "));
  var date_str = result_text.substr(result_text.search(" on ")+4,40).replace('!','');
  discord_dict["title"] = title_text;
  discord_dict["desc"] = "Invalid Portal\nSubmitted on: " + date_str;
  return post_wayfarer_email_to_discord(discord_dict);

}

function process_photo_email( html_data, emailAddr )
{
  var discord_dict = get_blank_discord_dict();
  discord_dict["who"] = emailAddr;
  var images_text = html_data[242];
  var images_split = images_text.split('<');
  var i_split = images_split[2].split('=');
  var sub_photo_0 = i_split[1].replace(/ alt/g, "");
  var sub_photo_1 = sub_photo_0.replace(/"/g, '');
  var sub_photo = sub_photo_1.replace('/>', '');
  var sub_photo_f = sub_photo.trim();
  // Title Text
  var result_text = html_data[239].trim().replace(/<[^>]*>/g, "");
  result_text = result_text.replace("Thank you for your Wayspot Photo submission for ", '').trim();
  var a = result_text.split(":");
  var title_text = a[1].trim();
  discord_dict["result"] = "Portal Photo Submitted";
  discord_dict["title"] = title_text;
  discord_dict["desc"] = "Photo Submitted";
  discord_dict["color"] = 0xef38dc;
  discord_dict["sub_photo"] = sub_photo_f;
  discord_dict["sup_photo"] = "https://cr0ybot.github.io/ingress-logos/ingress.png";
  return post_wayfarer_email_to_discord(discord_dict);
}

function process_photo_decision_email( html_data, emailAddr )
{  
  var discord_dict = get_blank_discord_dict();
  discord_dict["who"] = emailAddr;
  var images_text = html_data[238];
  var images_split = images_text.split('<');
  var i_split = images_split[2].split('=');
  var sub_photo_0 = i_split[1].replace(/ alt/g, "");
  var sub_photo_1 = sub_photo_0.replace(/"/g, '');
  var sub_photo = sub_photo_1.replace('/>', '');
  var sub_photo_f = sub_photo.trim();
  // Title Text
  var result_text = html_data[235].trim().replace(/<[^>]*>/g, "");
  result_text = result_text.replace("Thank you for your Wayspot Photo submission for ", '').trim();
  var title_text = result_text.substr(0,result_text.search(" on "));
  var date_str = result_text.substr(result_text.search(" on ")+4,40).replace('!','');

  var RTEXT = html_data[241];
  var decision = "";
  if ( RTEXT.search("Congratulations") != -1 )
  {
    decision = "Portal Photo Accepted";
    discord_dict["color"] = 0x34ebc3;
  } else
  {
    decision = "Portal Photo Denied";
    discord_dict["color"] = 0xf71717;
  }

  discord_dict["title"] = title_text;
  discord_dict["desc"] = "Submitted on: " + date_str;
  discord_dict["sub_photo"] = sub_photo_f;
  discord_dict["result"] = decision;
  discord_dict["sup_photo"] = "https://cr0ybot.github.io/ingress-logos/ingress.png";
  //discord_dict["color"] = 0x34ebc3;
  return post_wayfarer_email_to_discord(discord_dict);

}

function process_edit_email( html_data, emailAddr )
{
  Logger.log("Processing Edit Email");
  var discord_dict = get_blank_discord_dict();
  discord_dict["who"] = emailAddr;
  //16 title 239
  var title_text = html_data[239]; //.substr(result_text.search(":"),50);
  title_text = title_text.replace("<br/>", "").trim();
  discord_dict["title"] = title_text;
  discord_dict["result"] = "__Portal Edit Submitted__";
  var what_edited = html_data[240];
  if ( what_edited.search("Existing title: ") != -1 )
  {
    // Title Edit
    what_edited = what_edited.replace("<br/>", "");
    what_edited = what_edited.trim();
    var e = what_edited.split(":");
    discord_dict["desc"] = "Title Edit\nExisting Title: " + e[1];
    var edit = html_data[241];
    edit = edit.replace("<br/>", "");
    edit = edit.trim();
    var d = edit.split(":");
    discord_dict["desc"] = discord_dict["desc"] + "\nSuggested Edit:" + d[1];
  }
  else if ( what_edited.search("Existing location: ") != -1 )
  {
    // location edit
    what_edited = what_edited.replace("<br/>", "");
    what_edited = what_edited.trim();
    var e = what_edited.split(":");
    var lll = e[1].split(",");
    lll[0] = lll[0].replace(" ", "");
    lll[0] = lll[0].replace("(", "");
    lll[1] = lll[1].replace(" ", "");
    lll[1] = lll[1].replace(")", "");
    var link_curr = "https://intel.ingress.com/?pll=" + lll[0] + ',' + lll[1];
    discord_dict["desc"] = "Location Edit\nCurrrent Location:" + link_curr;
    var edit = html_data[242];
    edit = edit.replace("<br/>", "");
    edit = edit.trim();
    var d = edit.split(",");
    d[0] = d[0].replace(" ", "");
    d[0] = d[0].replace("(", "");
    d[1] = d[1].replace(" ", "");
    d[1] = d[1].replace(")", "");
    var link_neww = "https://maps.google.com/?q=" + d[0] + ',' + d[1];
    discord_dict["desc"] = discord_dict["desc"] + "\nSuggested Edit:" + link_neww;
  }
  else if ( what_edited.search("Existing description: ") != -1 )
  {
    // desc edit.
    what_edited = what_edited.replace("<br/>", "");
    what_edited = what_edited.trim();
    var e = what_edited.split(":");
    discord_dict["desc"] = "Description Edited\n\nExisting Description: " + e[1];
    var edit = html_data[241];
    edit = edit.replace("<br/>", "");
    edit = edit.trim();
    var d = edit.split(":");
    discord_dict["desc"] = discord_dict["desc"] + "\n\nSuggested Edit:" + d[1];
  }
  discord_dict["color"] = 0xeb34dc;
  Logger.log(discord_dict);
  // 17 Location | title  240
  //if ( html_data[]) 
  // 18 Edit: 241
  return post_wayfarer_email_to_discord(discord_dict);
}

/**************************************************************************************
** @brief 
**************************************************************************************/
function process_edit_decision_email( html_data, emailAddr )
{
  var ret_val = false;
  Logger.log("Processing Edit Decision");
  var desc_text = html_data[235].replace(/<.*?>/g, '');
  // decide which it is.
  if ( desc_text.search("title suggestion") != -1 )
  {
    ret_val = process_edit_title_decision_email(html_data, emailAddr);
  }
  else if (desc_text.search("location suggestion") != -1)
  {
    ret_val = process_edit_location_decision_email(html_data, emailAddr);
  }
  else if (desc_text.search("description suggestion") != -1)
  {
    ret_val = process_edit_desc_decision_email(html_data, emailAddr);
  }
  /*
  var discord_dict = get_blank_discord_dict();
  discord_dict["who"] = emailAddr;
  if ( html_data[238].search("decided to accept") != -1 )
  {
    discord_dict["result"] = "__Portal Edit Accepted__";
    discord_dict["color"] = 0x57f717; 
  } else 
  {
    discord_dict["result"] = "__Portal Edit Denied__";
    discord_dict["color"] = 0xf71717; 
  }
  var t = html_data[235].split("<br/>");
  var result_text = t[0].replace(" Thank you for your Wayspot title suggestion for ", '').trim();
  var title_text = result_text.substr(result_text.search(" for your Wayspot title suggestion for "));
  var date_str = result_text.substr(result_text.search(" on ")+4,40).replace('!','').replace(".</td>", '');
  discord_dict["title"] = title_text;
  discord_dict["desc"] = "Was Submitted on:" + date_str;
  post_wayfarer_email_to_discord(discord_dict);
  */
  return ret_val;
}

/**************************************************************************************
** @brief 
**************************************************************************************/
function process_edit_location_decision_email( html_data, emailAddr )
{
  Logger.log("Processing Edit Location Decision");
  var discord_dict = get_blank_discord_dict();
  discord_dict["who"] = emailAddr;
  var ret_val = false;
  var loc_of_for = html_data[12].search(" for ");
  var len_of_sub = html_data[12].len;
  var title_text = html_data[12].substr(loc_of_for+5, len_of_sub).trim();
  Logger.log("Title: " + title_text);
  var result_text = html_data[238].replace(/<.*?>/g, '');
  if( result_text.search("decided to accept") != -1 )
  {
    discord_dict["result"] = "__Portal Location Edit Accepted__";
    discord_dict["color"] = 0x57f717;
  } else {
    discord_dict["result"] = "__Portal Location Edit Denied__";
    discord_dict["color"] = 0xf71717;
  }
  Logger.log("Processing Edit Location Decision: " + result_text);
  discord_dict["title"] = title_text;
  discord_dict["desc"] = "Location Edit";
  ret_val = post_wayfarer_email_to_discord(discord_dict);
  return ret_val;
}

/**************************************************************************************
** @brief 
**************************************************************************************/
function process_edit_title_decision_email( html_data, emailAddr )
{
  Logger.log("Processing Edit Title Decision");
  var discord_dict = get_blank_discord_dict();
  discord_dict["who"] = emailAddr;
  var ret_val = false;
  //var desc_text = html_data[235].replace(/<.*?>/g, '');
  var loc_of_for = html_data[12].search(" for ");
  var len_of_sub = html_data[12].len;
  var title_text = html_data[12].substr(loc_of_for+5, len_of_sub).trim();
  Logger.log("Title: " + title_text);
  var result_text = html_data[238].replace(/<.*?>/g, '');
  if( result_text.search("decided to accept") != -1 )
  {
    discord_dict["result"] = "__Portal Title Edit Accepted__";
    discord_dict["color"] = 0x57f717;
  } else {
    discord_dict["result"] = "__Portal Title Edit Denied__";
    discord_dict["color"] = 0xf71717;
  }
  Logger.log("Processing Edit Title Decision: " + result_text);
  discord_dict["title"] = title_text;
  discord_dict["desc"] = "Title Edit";
  ret_val = post_wayfarer_email_to_discord(discord_dict);
  return ret_val;
}

/**************************************************************************************
** @brief 
**************************************************************************************/
function process_edit_desc_decision_email( html_data, emailAddr )
{
  Logger.log("Processing Edit Desc Decision");
  var discord_dict = get_blank_discord_dict();
  discord_dict["who"] = emailAddr;
  var ret_val = false;
  var loc_of_for = html_data[12].search(" for ");
  var len_of_sub = html_data[12].len;
  var title_text = html_data[12].substr(loc_of_for+5, len_of_sub).trim();
  Logger.log("Title: " + title_text);
  var result_text = html_data[238].replace(/<.*?>/g, '');
  if( result_text.search("decided to accept") != -1 )
  {
    discord_dict["result"] = "__Portal Description Edit Accepted__";
    discord_dict["color"] = 0x57f717;
  } else {
    discord_dict["result"] = "__Portal Description Edit Denied__";
    discord_dict["color"] = 0xf71717;
  }
  Logger.log("Processing Edit Description Decision: " + result_text);
  discord_dict["title"] = title_text;
  discord_dict["desc"] = "Description Edit";
  ret_val = post_wayfarer_email_to_discord(discord_dict);
  return ret_val;
}

/**************************************************************************************
** @brief 
**************************************************************************************/
function appeal_decided(html_data, emailAddr)
{
  // Wayspot appeal has been decided
  Logger.log("Processing Appeal Decision");
  var discord_dict = get_blank_discord_dict();
  discord_dict["who"] = emailAddr;
  var ret_val = false;
  var loc_of_for = html_data[11].search(" for ");
  var len_of_sub = html_data[11].len;
  var title_text = html_data[11].substr(loc_of_for+5, len_of_sub).trim();
  Logger.log("Title: " + title_text);
  var result_text = html_data[238].replace(/<.*?>/g, '');
  if( result_text.search("decided that your nomination should be added as a Wayspot") != -1 )
  {
    discord_dict["result"] = "__Portal Appeal Accepted__";
    discord_dict["color"] = 0x57f717;
  } else {
    discord_dict["result"] = "__Portal Appeal Denied__";
    discord_dict["color"] = 0xf71717;
  }
  Logger.log("Processing Appeal Decision: " + result_text);
  discord_dict["title"] = title_text;
  discord_dict["desc"] = "Appeal";
  ret_val = post_wayfarer_email_to_discord(discord_dict);
  return ret_val;
}

/**************************************************************************************
** @brief 
**************************************************************************************/
function appeal_submitted(html_data, emailAddr)
{
  // Wayspot appeal has been decided
  Logger.log("Processing Appeal Decision");
  var discord_dict = get_blank_discord_dict();
  discord_dict["who"] = emailAddr;
  var ret_val = false;
  var loc_of_for = html_data[11].search(" for ");
  var len_of_sub = html_data[11].len;
  var title_text = html_data[11].substr(loc_of_for+5, len_of_sub).trim();
  title_text = title_text.replace("!","");
  title_text = title_text.replace("#","");
  Logger.log("Title: " + title_text);
  var images_text = html_data[242];
  var images_split = images_text.split('<');
  var i_split1 = images_split[2].split('=');
  var i_split2 = images_split[5].split('=');
  // "http://lh3.googleusercontent.com/gEEvKxFZUAScWB2aDA7nY03c6Sv41PBwBgKVzjDPExSlrZSO9OvrhcKX2CAz-3eLfYZjcAGi0_108-dKqmyfM9d5sjUB2S6ppj9OSLdDTw alt"
  var sub_photo = i_split1[1].replace(/ alt/g, "");
  var sup_photo = i_split2[1].replace(/ alt/g, "");
  var nomination_desc = html_data[240].replace("<br/>", "").trim();
  discord_dict = {
    "sub_photo" : sub_photo,
    "sup_photo" : sup_photo,
    "title" : title_text,
    "desc" : nomination_desc,
    "location" : "None",
    "result" : "__Portal Appeal Submitted__",
    "who" : emailAddr,
    "color" : 0xFF00FF
  };
  ret_val = post_wayfarer_email_to_discord(discord_dict);
  return ret_val;
}

/**************************************************************************************
** @brief 
**************************************************************************************/
function mission_submission_parser(msgHTMLSplit, whoTo)
{
  // Wayspot appeal has been decided
  Logger.log("Processing Mission Submission");
  var discord_dict = get_blank_discord_dict();
  discord_dict["who"] = whoTo;
  var ret_val = false;
  var len = msgHTMLSplit.length;
  var MissionName = msgHTMLSplit.substr(36,len);
  discord_dict = {   
    "sub_photo" : "None",
    "sup_photo" : "None",
    "title" : MissionName,
    "desc" : "No Desc Availible",
    "who" : whoTo,
    "result" : "__Mission Submitted__",
    "color" : 0x0000FF
  };
  ret_val = post_wayfarer_email_to_discord(discord_dict);
  return ret_val;
}

/**************************************************************************************
** @brief 
**************************************************************************************/
function mission_approval_parser(msgHTMLSplit, whoTo)
{
  // Wayspot appeal has been decided
  Logger.log("Processing Mission Approval");
  var discord_dict = get_blank_discord_dict();
  discord_dict["who"] = whoTo;
  var ret_val = false;
  var len = msgHTMLSplit.length;
  var MissionName = msgHTMLSplit.substr(26,len);
  discord_dict = {   
    "sub_photo" : "None",
    "sup_photo" : "None",
    "title" : MissionName,
    "desc" : "No Desc Availible",
    "who" : whoTo,
    "result" : "__Mission Approved__",
    "color" : 0xCCAAFF
  };
  ret_val = post_wayfarer_email_to_discord(discord_dict);
  return ret_val;
}

/**************************************************************************************
** @brief 
**************************************************************************************/
function mission_rejection_parser(sub, whoTo, msgHTMLSplit)
{
  // Wayspot appeal has been decided
  Logger.log("Processing Mission Rejection");
  var discord_dict = get_blank_discord_dict();
  discord_dict["who"] = whoTo;
  var ret_val = false;
  var len = sub.length;
  var MissionName = sub.substr(26,len);
  var desc = "";
  var reason1 = msgHTMLSplit[2].replace("<li>","").replace("</li>","");
  var reason2 = msgHTMLSplit[3].replace("<li>","").replace("</li>","");
  var reason3 = msgHTMLSplit[4].replace("<li>","").replace("</li>","");
  desc = reason1 + "\n" + reason2 + "\n" + reason3;
  discord_dict = {   
    "sub_photo" : "None",
    "sup_photo" : "None",
    "title" : MissionName,
    "desc" : desc,
    "who" : whoTo,
    "result" : "__Mission Rejected__",
    "color" : 0xCCAAFF
  };
  ret_val = post_wayfarer_email_to_discord(discord_dict);
  return ret_val;
}

/**************************************************************************************
** @brief 
**************************************************************************************/
function process_descision_email_wayfarer_submitted( msgHTMLSplit, whoTo )
{
  Logger.log("Processing Wayfarer Submitted Email");
  var discord_dict = get_blank_discord_dict();
  discord_dict["who"] = whoTo;
  var ret_val = false;
  var loc_of_for = msgHTMLSplit.search(" for ");
  var loc_of_has = msgHTMLSplit.search(" has ");
  var LENGTH = loc_of_has - loc_of_for;
  var len_of_sub = msgHTMLSplit.len;
  var title_text = msgHTMLSplit.substr(loc_of_for+6, LENGTH-7).trim();
  title_text = title_text.replace("!","");
  title_text = title_text.replace("#","");
  Logger.log("Title: " + title_text);

  var result = "";
  var color = 0x000000;

  if ( msgHTMLSplit.search("approved") != -1 ){
    result = "__Portal Wayfarer Lightship Approved__"
    color = 0x00FF00;
  } else {
    result = "__Portal Wayfarer Lightship Denied__"
    color = 0xFF0000;
  }

  discord_dict = {
    "sub_photo" : "None",
    "sup_photo" : "None",
    "title" : title_text,
    "desc" : "No Desc Availible",
    "location" : "None",
    "result" : result,
    "who" : whoTo,
    "color" : color
  };
  ret_val = post_wayfarer_email_to_discord(discord_dict);
  return ret_val;
}

/**************************************************************************************
** @brief Post a Message to Discord
** @param dict A dictionary containing info about the processed data
**************************************************************************************/
function post_wayfarer_email_to_discord( post_dict ) {
  var post_to_discord = false;
  if( post_to_discord )
  {
    return ___post_to_discord( post_dict );
  } else {
    return postMessageToTelegram( post_dict );
  }
}

function ___post_to_discord( post_dict ){
  Logger.log(post_dict);
  message = ""; //post_dict["result"] + "\n__Description:__ " + post_dict["desc"] + "\n__Created by__: " + getUserNameFromEmail(post_dict["who"]);
  var discordUrl = getDiscordUrl();
  var payload;

  var url = "Not Provided";
  if (post_dict["location"] != "None")
  {
    url = post_dict["intel"]
  }
  if (post_dict["sub_photo"].search("None") == -1) {
    // if we find an imgUrl instead of the word None
    payload = JSON.stringify(
      {
        content : message,
        embeds:[
          {
            type: "rich",
            title: "**" + post_dict["result"] + "**",
            description: "",
            color: post_dict["color"],
            fields: [
              {
                name: "**" + replaceHtmlThings(post_dict["title"]) + "**",
                value: post_dict["desc"],
                inline: true
              },
              {
                name: "**Submitted By**",
                value : getUserNameFromEmail(post_dict["who"]),
                inline : true
              },
              {
                name: "**Location**",
                value: url,
                inline: true
              }
            ],
            image: {
              url: post_dict["sub_photo"]
            },
            thumbnail: {
              url: post_dict["sup_photo"]
            }
          }
        ]});
  } else {
    payload = JSON.stringify(
      {
        content : message,
        embeds:[
          {
            type: "rich",
            title: "**" + post_dict["result"] + "**",
            description: "",
            color: post_dict["color"],
            fields: [
              {
                name: "**" + post_dict["title"] + "**",
                value: post_dict["desc"],
                inline: true
              },
              {
                name: "**Submitted By**",
                value : getUserNameFromEmail(post_dict["who"]),
                inline : true
              }
            ]
          }
        ]});
  }
  var params = {
    headers: {
      'Content-Type': 'application/json'
    },
    method: "POST",
    payload: payload,
    muteHttpExceptions: false
  };
  Logger.log("Discord: " + payload);
  var response = UrlFetchApp.fetch(discordUrl, params);
  Logger.log("Discord: Done!" + response.getResponseCode())
  var ret_val = false;
  if ( response.getResponseCode() == 204 ){
    ret_val = true;
  } else {
    ret_val = false;
  }
  return ret_val;
}

/**************************************************************************************
** @brief Untested - Send a message to a telegram channel
**************************************************************************************/
function postMessageToTelegram( post_dict )
{
  var botToken = getTelegramApi();
  var chatId = getTelegramChatId();
  var message = "";
  var teleUrl = ""; 
  var payload;

  if (post_dict["sub_photo"].search("None") == -1) {
    // if we find an imgUrl instead of the word None
    if (post_dict["location"] != "None")
    {
      url = post_dict["location"]
    }
    message += "*" + post_dict["result"] + "*" + "\n*Name:* " + post_dict["title"] + "\n*Description:* " + post_dict["desc"] + "\n*Created by:* " + getUserNameFromEmail(post_dict["who"]);
    /**message += "\n[Intel Link](" + url + ")"*/
    payload = JSON.stringify({chat_id: chatId, text: message, parse_mode: 'markdown'});
    teleUrl =  "https://api.telegram.org/bot" + botToken + "/sendMessage";
    var params = {
      headers: {
        'Content-Type': 'application/json'
      },
      method: "POST",
      payload: payload,
      muteHttpExceptions: false
    };
    Logger.log("Telegram:" + payload);
    var response = UrlFetchApp.fetch(teleUrl, params);
    Logger.log(response.getAllHeaders());
    Logger.log(response.getContentText());
    Logger.log("Telegram Done!"); 
    payload = JSON.stringify(
      {
        chat_id: chatId,
        photo: post_dict["sub_photo"],
        caption: post_dict["title"],
      });
    teleUrl =  "https://api.telegram.org/bot" + botToken + "/sendPhoto";
    var params = {
      headers: {
        'Content-Type': 'application/json'
      },
      method: "POST",
      payload: payload,
      muteHttpExceptions: false
    };
    Logger.log("Telegram:" + payload);
    var response = UrlFetchApp.fetch(teleUrl, params);
    Logger.log(response.getAllHeaders());
    Logger.log(response.getContentText());
    Logger.log("Telegram Done!"); 
    return true;

  } else {
    message += post_dict["result"] + "\n*Name:* " + post_dict["title"] + "\n*Description:* " + post_dict["desc"] + "\n*Created by*: " + getUserNameFromEmail(post_dict["who"]);
    payload = JSON.stringify({chat_id: chatId, text: message, parse_mode: 'markdown'});
    teleUrl =  "https://api.telegram.org/bot" + botToken + "/sendMessage";
    var params = {
      headers: {
        'Content-Type': 'application/json'
      },
      method: "POST",
      payload: payload,
      muteHttpExceptions: false
    };
    Logger.log("Telegram:" + payload);
    var response = UrlFetchApp.fetch(teleUrl, params);
    Logger.log(response.getAllHeaders());
    Logger.log(response.getContentText());
    Logger.log("Telegram Done!"); 
    return true;
  }
    
  
  
}

/**************************************************************************************
** @brief Return a dict used to populate discord info
** @param userEmail
**************************************************************************************/
function get_blank_discord_dict()
{
  var discord_dict = {
    "sub_photo" : "None",
    "sup_photo" : "None",
    "location" : "None",
    "title" : "None",
    "desc" : "None",
    "result" : "None",
    "who" : "None",
    "color" : 0x0
  };
  return discord_dict;
}

function replaceHtmlThings( input )
{
  if( input.search("&quot;") != -1 )
  {
    input.replace("&quot;", "'");
  }
  if( input.search("&amp;") != -1 )
  {
    input.replace("&amp;", "&");
  }
  if( input.search("&apos;") != -1 )
  {
    input.replace("&apos;", "'");
  }
  if( input.search("&lt;") != -1 )
  {
    input.replace("&lt;", "<");
  }
  if( input.search("&gt;") != -1 )
  {
    input.replace("&gt;", ">");
  }
  return input;
}

/**************************************************************************************
** @brief Return a Discord approp name
** @param userEmail
**************************************************************************************/
function getUserNameFromEmail(userEmail)
{
  if (userEmail.search("something") != -1){
    return "someone";
  }
} 

/**************************************************************************************
** @brief Return a Discord URL for a webhook
**************************************************************************************/
function getDiscordUrl()
{
  return 'webhookurl';
}

/**************************************************************************************
** @brief Return a Telegram API Key for a webhook
**************************************************************************************/
function getTelegramApi()
{
  return "api:keys";
}

/**************************************************************************************
** @brief Return a Discord URL for a webhook
**************************************************************************************/
function getTelegramChatId()
{
  // get your chat ID: curl https://api.telegram.org/bot<BOT_TOKEN>/getUpdates
  return -1;
}
