var TodoistAccount, TodoistImportTag, TodoistHeader, key, autoParentUid, autoBlockUid, TodoistLabelId, TodoistAfterActionLabel, myLabels;
var checkInterval = 0;
var auto = false;
var autoBlockUidLength = 0;
var thisBlock = undefined;

export default {
    onload: ({ extensionAPI }) => {
        const config = {
            tabTitle: "Universal Quick Capture",
            settings: [
                {
                    id: "uqcrr-token",
                    name: "Todoist API Token",
                    description: "Your API token from https://todoist.com/app/settings/integrations",
                    action: { type: "input", placeholder: "Add Todoist API token here" },
                },
                {
                    id: "uqcrr-inbox-id",
                    name: "Todoist Inbox ID",
                    description: "Your Todoist inbox id",
                    action: { type: "input", placeholder: "Add inbox id here" },
                },
                {
                    id: "uqcrr-auto",
                    name: "Automatic Download",
                    description: "Import items to the DNP automatically",
                    action: {
                        type: "switch",
                        onChange: (evt) => { setAuto(evt); }
                    },
                },
                {
                    id: "uqcrr-auto-time",
                    name: "Automatic Download interval",
                    description: "Frequency in minutes to check for new items",
                    action: { type: "input", placeholder: "15" },
                },
                {
                    id: "uqcrr-account",
                    name: "Todoist Account Type",
                    description: "Free or Premium",
                    action: { type: "input", placeholder: "Free" },
                },
                {
                    id: "uqcrr-import-tag",
                    name: "Roam Research Tag",
                    description: "Set this tag in Roam Research on import",
                    action: { type: "input", placeholder: "Quick Capture" },
                },
                {
                    id: "uqcrr-import-header",
                    name: "Roam Research Header",
                    description: "Text Header for Roam Research on import",
                    action: { type: "input", placeholder: "Imported Quick Capture items" },
                },
                {
                    id: "uqcrr-label-mode",
                    name: "Todoist Label Mode",
                    description: "Only import tasks with a specific label in Todoist",
                    action: { type: "switch" },
                },
                {
                    id: "uqcrr-label-id",
                    name: "Todoist Label Name (optional)",
                    description: "Define the Todoist label to import (label name)",
                    action: { type: "input", placeholder: "" },
                },
                {
                    id: "uqcrr-output-todo",
                    name: "Output as TODO",
                    description: "Import the item as a Roam TODO",
                    action: { type: "switch" },
                },
                {
                    id: "uqcrr-get-description",
                    name: "Get Description",
                    description: "Import the item description from Todoist",
                    action: { type: "switch" },
                },
                {
                    id: "uqcrr-no-tag",
                    name: "No Tag",
                    description: "Don't apply a tag in Roam Research",
                    action: { type: "switch" },
                },
                {
                    id: "uqcrr-created-date",
                    name: "Created Date",
                    description: "Import the item created date",
                    action: { type: "switch" },
                },
                {
                    id: "uqcrr-due-dates",
                    name: "Due Dates",
                    description: "Import the item due date",
                    action: { type: "switch" },
                },
                {
                    id: "uqcrr-priority",
                    name: "Priority",
                    description: "Import the item priority",
                    action: { type: "switch" },
                },
                {
                    id: "uqcrr-labelsTags",
                    name: "Import Labels",
                    description: "Import Todoist labels as Roam Research tags",
                    action: { type: "switch" },
                },
                {
                    id: "uqcrr-afterImport",
                    name: "Action after Import",
                    description: "Delete the item in Todoist, label it in Todoist, or do nothing",
                    action: { type: "select", items: ["Nothing", "Delete", "Label"] },
                },
                {
                    id: "uqcrr-afterImportLabel",
                    name: "Todoist Label for after Import",
                    description: "Label for item in Todoist after Import",
                    action: { type: "input", placeholder: "Exported_to_Roam" },
                },
            ]
        };
        extensionAPI.settings.panel.create(config);

        window.roamAlphaAPI.ui.commandPalette.addCommand({
            label: "Import Quick Capture items from Todoist",
            callback: () => importTodoist(),
        });

        async function setAuto(evt) { // onchange
            if (evt.target.checked) {
                auto = true;
                autoDL();
            } else {
                auto = false;
                if (checkInterval > 0) clearInterval(checkInterval);
            }
        }

        if (extensionAPI.settings.get("uqcrr-auto") == true) { // onload
            auto = true;
            autoDL();
        }

        async function importTodoist(auto) {
            thisBlock = await window.roamAlphaAPI.ui.getFocusedBlock()?.["block-uid"];
            breakme: {
                if (!extensionAPI.settings.get("uqcrr-token")) {
                    key = "API";
                    sendConfigAlert(key);
                    break breakme;
                } else if (!extensionAPI.settings.get("uqcrr-inbox-id")) {
                    key = "inboxID";
                    sendConfigAlert(key);
                    break breakme;
                } else {
                    const myToken = extensionAPI.settings.get("uqcrr-token");
                    const TodoistInboxId = extensionAPI.settings.get("uqcrr-inbox-id");
                    if (!extensionAPI.settings.get("uqcrr-account")) {
                        TodoistAccount = "Free";
                    } else {
                        const regex = /^Free|Premium$/;
                        if (extensionAPI.settings.get("uqcrr-account").match(regex)) {
                            TodoistAccount = extensionAPI.settings.get("uqcrr-account");
                        } else {
                            key = "Acct";
                            sendConfigAlert(key);
                            break breakme;
                        }
                    }
                    if (!extensionAPI.settings.get("uqcrr-import-tag")) {
                        TodoistImportTag = "Quick Capture";
                    } else {
                        TodoistImportTag = extensionAPI.settings.get("uqcrr-import-tag");
                    }
                    if (!extensionAPI.settings.get("uqcrr-import-header")) {
                        TodoistHeader = "Imported Quick Capture items:";
                    } else {
                        TodoistHeader = extensionAPI.settings.get("uqcrr-import-header");
                    }
                    if (extensionAPI.settings.get("uqcrr-label-mode") == true) {
                        if (!extensionAPI.settings.get("uqcrr-label-id")) {
                            var key = "label"
                            sendConfigAlert(key);
                        } else {
                            TodoistLabelId = extensionAPI.settings.get("uqcrr-label-id");
                        }
                    }
                    const TodoistLabelMode = extensionAPI.settings.get("uqcrr-label-mode");
                    const TodoistOutputTodo = extensionAPI.settings.get("uqcrr-output-todo");
                    const TodoistGetDescription = extensionAPI.settings.get("uqcrr-get-description");
                    const TodoistNoTag = extensionAPI.settings.get("uqcrr-no-tag") || "False";
                    const TodoistLabelsasTags = extensionAPI.settings.get("uqcrr-labelsTags");
                    const TodoistCreatedDate = extensionAPI.settings.get("uqcrr-created-date");
                    const TodoistDueDates = extensionAPI.settings.get("uqcrr-due-dates");
                    const TodoistPriority = extensionAPI.settings.get("uqcrr-priority");
                    const TodoistAfterAction = extensionAPI.settings.get("uqcrr-afterImport");

                    if (extensionAPI.settings.get("uqcrr-afterImport") == "Label") {
                        if (!extensionAPI.settings.get("uqcrr-afterImportLabel")) {
                            TodoistAfterActionLabel = "Exported_to_Roam";
                        } else {
                            TodoistAfterActionLabel = extensionAPI.settings.get("uqcrr-afterImportLabel");
                        }
                    }

                    var url = "https://api.todoist.com/rest/v2/tasks?project_id=" + TodoistInboxId + "";

                    var myHeaders = new Headers();
                    var bearer = 'Bearer ' + myToken;
                    myHeaders.append("Authorization", bearer);
                    myHeaders.append("Content-Type", "application/json");
                    var requestOptions = {
                        method: 'GET',
                        headers: myHeaders,
                        redirect: 'follow'
                    };

                    const response = await fetch(url, requestOptions);
                    const myTasks = await response.text();
                    var task;
                    let taskList = [];
                    let subTaskList = [];

                    if (TodoistAfterAction == "Label" || TodoistLabelsasTags) {
                        var labelUrl = "https://api.todoist.com/rest/v2/labels";
                        const responseLabels = await fetch(labelUrl, requestOptions);
                        myLabels = await responseLabels.json();
                    }
                    for await (task of JSON.parse(myTasks)) {
                        if (TodoistLabelMode == true) {
                            if (task.hasOwnProperty("labels")) {
                                for (var i = 0; i < task.labels.length; i++) {
                                    if (task.labels[i] == TodoistLabelId) {
                                        if (task.hasOwnProperty('parent_id') && task.parent_id != null) {
                                            subTaskList.push({ id: task.id, parent_id: task.parent_id, order: task.order, content: task.content });
                                        } else {
                                            taskList.push({ id: task.id, uid: "temp" });
                                        }
                                    }
                                }
                            }
                        } else {
                            if (task.hasOwnProperty('parent_id') && task.parent_id != null) {
                                subTaskList.push({ id: task.id, parent_id: task.parent_id, order: task.order, content: task.content });
                            } else {
                                taskList.push({ id: task.id, uid: "temp" });
                            }
                        }
                    }

                    var existingItems;

                    if (Object.keys(taskList).length > 0) {
                        if (!auto) {
                            await window.roamAlphaAPI.updateBlock({
                                block: { uid: thisBlock, string: TodoistHeader.toString()}
                            });
                            existingItems = await window.roamAlphaAPI.q(`[:find (pull ?page [:node/title :block/string :block/uid {:block/children ...} ]) :where [?page :block/uid "${thisBlock}"] ]`);
                        } else {
                            // get today's DNP uid
                            var today = new Date();
                            var dd = String(today.getDate()).padStart(2, '0');
                            var mm = String(today.getMonth() + 1).padStart(2, '0');
                            var yyyy = today.getFullYear();
                            autoParentUid = mm + '-' + dd + '-' + yyyy;
                            // find or create QC header
                            autoBlockUid = await window.roamAlphaAPI.q(`[:find ?u :where [?b :block/page ?p] [?b :block/uid ?u] [?b :block/string "${TodoistHeader}"] [?p :block/uid "${autoParentUid}"]]`)?.[0]?.[0];
                            if (autoBlockUid == undefined) {
                                const uid = window.roamAlphaAPI.util.generateUID();
                                await window.roamAlphaAPI.createBlock({
                                    location: { "parent-uid": autoParentUid, order: 9999 },
                                    block: { string: TodoistHeader, uid }
                                });
                                autoBlockUid = uid;
                            }
                            autoBlockUidLength = await window.roamAlphaAPI.q(`[:find ?c :where [?e :block/children ?c] [?e :block/uid "${autoBlockUid}"]]`).length; //with thanks to David Vargas https://github.com/dvargas92495/roam-client/blob/main/src/queries.ts#L301
                            existingItems = await window.roamAlphaAPI.q(`[:find (pull ?page [:node/title :block/string :block/uid {:block/children ...} ]) :where [?page :block/uid "${autoBlockUid}"] ]`);
                        }

                        for (var i = 0; i < taskList.length; i++) {
                            for await (task of JSON.parse(myTasks)) {
                                if (taskList[i].id == task.id) {
                                    var matchedItem = false;
                                    var matchedUid;
                                    if (existingItems.length > 0 && existingItems[0][0].hasOwnProperty("children")) {
                                        var regex = new RegExp("^" + task.content + "", "g");
                                        for (var m = 0; m < existingItems[0][0].children.length; m++) {
                                            if (regex.test(existingItems[0][0].children[m].string)) {
                                                matchedItem = true;
                                                matchedUid = existingItems[0][0].children[m].uid;
                                            }
                                        }
                                    }

                                    // print item
                                    var itemString = "";
                                    if (TodoistOutputTodo == true) {
                                        itemString += "{{[[TODO]]}} "
                                    }
                                    itemString += "" + task.content + "";
                                    if (TodoistNoTag !== true) {
                                        itemString += " #[[" + TodoistImportTag + "]]";
                                    }
                                    if (TodoistLabelsasTags == true && task.labels.length > 0) {
                                        for (var z = 0; z < task.labels.length; z++) {
                                            for (var y = 0; y < myLabels.length; y++) {
                                                if (task.labels[z] == myLabels[y].name) {
                                                    if (myLabels[y].name != TodoistAfterActionLabel) {
                                                        itemString += ' #' + myLabels[y].name + '';
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    if (TodoistCreatedDate == true) {
                                        var createdDate = task.created_at.split("T");
                                        itemString += " Created: [[" + convertToRoamDate(createdDate[0]) + "]]";
                                    }
                                    if (TodoistDueDates == true && task.due != null) {
                                        itemString += " Due: [[" + convertToRoamDate(task.due.date) + "]]";
                                    }
                                    if (TodoistPriority == true) {
                                        if (task.priority == "4") {
                                            var priority = "1";
                                        } else if (task.priority == "3") {
                                            var priority = "2";
                                        } else if (task.priority == "2") {
                                            var priority = "3";
                                        } else if (task.priority == "1") {
                                            var priority = "4";
                                        }
                                        itemString += " #Priority-" + priority + "";
                                    }

                                    const uid = window.roamAlphaAPI.util.generateUID();
                                    if (auto && matchedItem) {
                                        await window.roamAlphaAPI.updateBlock({
                                            block: {
                                                uid: matchedUid,
                                                string: itemString.toString()
                                            }
                                        });
                                    } else if (auto) {
                                        await window.roamAlphaAPI.createBlock({
                                            location: { "parent-uid": autoBlockUid, order: i + autoBlockUidLength },
                                            block: { string: itemString, uid }
                                        });
                                    } else if (matchedItem) {
                                        await window.roamAlphaAPI.updateBlock({
                                            block: {
                                                uid: matchedUid,
                                                string: itemString.toString()
                                            }
                                        });
                                    } else {
                                        await window.roamAlphaAPI.createBlock({
                                            location: { "parent-uid": thisBlock, order: i },
                                            block: { string: itemString, uid }
                                        });
                                    }

                                    // print description
                                    if (TodoistGetDescription == true && task.description) {
                                        const uid1 = window.roamAlphaAPI.util.generateUID();
                                        await window.roamAlphaAPI.createBlock({
                                            location: { "parent-uid": uid, order: 1 },
                                            block: { string: task.description, uid1 }
                                        });
                                    }

                                    // print comments
                                    if (task.comment_count > 0) {
                                        var url = "https://api.todoist.com/rest/v2/comments?task_id=" + task.id + "";
                                        const response = await fetch(url, requestOptions);
                                        const myComments = await response.text();
                                        let commentsJSON = await JSON.parse(myComments);

                                        var commentString = "";
                                        for (var j = 0; j < commentsJSON.length; j++) {
                                            commentString = "";
                                            if (commentsJSON[j].hasOwnProperty('attachment') && TodoistAccount == "Premium") {
                                                if (commentsJSON[j].attachment.file_type == "application/pdf") {
                                                    commentString = "{{pdf: " + commentsJSON[j].attachment.file_url + "}}";
                                                } else if (commentsJSON[j].attachment.file_type == "image/jpeg" || commentsJSON[j].attachment.file_type == "image/png") {
                                                    commentString = "![](" + commentsJSON[j].attachment.file_url + ")";
                                                } else {
                                                    commentString = "" + commentsJSON[j].content + "";
                                                }
                                            } else if (commentsJSON[j].hasOwnProperty('attachment')) {
                                                if (commentsJSON[j].attachment.file_type == "text/html") {
                                                    commentString = "" + commentsJSON[j].content + " [Email Body](" + commentsJSON[j].attachment.file_url + ")";
                                                }
                                            } else {
                                                commentString = "" + commentsJSON[j].content + "";
                                            }

                                            if (commentString.length > 0) {
                                                const newBlock = window.roamAlphaAPI.util.generateUID();
                                                await window.roamAlphaAPI.createBlock({
                                                    location: { "parent-uid": uid, order: j + 1 },
                                                    block: { string: commentString, newBlock }
                                                });
                                            }
                                        }
                                    }

                                    // print subtasks
                                    for (var k = 0; k < subTaskList.length; k++) {
                                        var results = window.roamAlphaAPI.data.pull("[:block/children]", [":block/uid", uid]);
                                        var children = 0;

                                        if (results != null) {
                                            children = results[":block/children"].length;
                                        }
                                        if (subTaskList[k].parent_id == task.id) {
                                            const newBlock = window.roamAlphaAPI.util.generateUID();
                                            await window.roamAlphaAPI.createBlock({
                                                location: { "parent-uid": uid, order: k + children },
                                                block: { string: subTaskList[k].content, newBlock }
                                            });
                                        }
                                    }

                                    var url = "https://api.todoist.com/rest/v2/tasks/" + task.id + "";
                                    if (TodoistAfterAction == "Delete") {
                                        var requestOptionsDelete = {
                                            method: 'DELETE',
                                            headers: myHeaders,
                                            redirect: 'follow'
                                        };
                                        await fetch(url, requestOptionsDelete);
                                    } else if (TodoistAfterAction == "Label") {
                                        myHeaders.append("Content-Type", "application/json");
                                        var taskcontent = '{"labels": ["' + TodoistAfterActionLabel + '"';
                                        for (var z = 0; z < task.labels.length; z++) {
                                            for (var y = 0; y < myLabels.length; y++) {
                                                if (task.labels[z] == myLabels[y].name) {
                                                    taskcontent += ', "' + myLabels[y].name + '"';
                                                }
                                            }
                                        }
                                        taskcontent += ']}';
                                        var requestOptionsLabel = {
                                            method: 'POST',
                                            headers: myHeaders,
                                            redirect: 'follow',
                                            body: taskcontent
                                        };
                                        await fetch(url, requestOptionsLabel);
                                    }
                                }
                            }
                        }
                    } else {
                        if (!auto) {
                            alert("No items to import");
                        }
                    }
                }
            }
        }

        async function autoDL() {
            const regex = /^\d{1,2}$/;
            if (regex.test(extensionAPI.settings.get("uqcrr-auto-time"))) {
                var checkEveryMinutes = extensionAPI.settings.get("uqcrr-auto-time");
            } else {
                var checkEveryMinutes = "15";
            }
            setTimeout(async () => {
                await importTodoist(auto);
                try { if (checkInterval > 0) clearInterval(checkInterval) } catch (e) { }
                checkInterval = setInterval(async () => {
                    await importTodoist(auto)
                }, checkEveryMinutes * 60000);
            }, 10000)
        }
    },
    onunload: () => {
        window.roamAlphaAPI.ui.commandPalette.removeCommand({
            label: 'Import Quick Capture items from Todoist'
        });
        if (checkInterval > 0) clearInterval(checkInterval);
    }
}

function convertToRoamDate(dateString) {
    var parsedDate = dateString.split('-');
    var year = parsedDate[0];
    var month = Number(parsedDate[1]);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var monthName = months[month - 1];
    var day = Number(parsedDate[2]);
    let suffix = (day >= 4 && day <= 20) || (day >= 24 && day <= 30)
        ? "th"
        : ["st", "nd", "rd"][day % 10 - 1];
    return "" + monthName + " " + day + suffix + ", " + year + "";
}

function sendConfigAlert(key) {
    if (key == "API") {
        alert("Please set your API token in the configuration settings via the Roam Depot tab.");
    } else if (key == "inboxID") {
        alert("Please set your inbox ID in the configuration settings via the Roam Depot tab.");
    } else if (key == "Acct") {
        alert("Please set your account as either Free or Premium in the configuration settings via the Roam Depot tab.");
    } else if (key == "label") {
        alert("To use the label import mode, please set your label ID in the configuration settings via the Roam Depot tab.");
    }
}