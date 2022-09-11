var TodoistAccount, TodoistImportTag, TodoistHeader, key, autoParentUid, autoBlockUid, TodoistLabelId;
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
                    name: "Todoist Label ID (optional)",
                    description: "Define the Todoist label to import",
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
                    const TodoistCreatedDate = extensionAPI.settings.get("uqcrr-created-date");
                    const TodoistDueDates = extensionAPI.settings.get("uqcrr-due-dates");
                    const TodoistPriority = extensionAPI.settings.get("uqcrr-priority");

                    var url = "https://api.todoist.com/rest/v1/tasks?project_id=" + TodoistInboxId + "";

                    var myHeaders = new Headers();
                    var bearer = 'Bearer ' + myToken;
                    myHeaders.append("Authorization", bearer);

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
                    for await (task of JSON.parse(myTasks)) {
                        if (TodoistLabelMode == true) {
                            if (task.hasOwnProperty("label_ids")) {
                                for (var i = 0; i < task.label_ids.length; i++) {
                                    if (task.label_ids[i] == TodoistLabelId) {
                                        if (task.hasOwnProperty('parent_id')) {
                                            subTaskList.push({ id: task.id, parent_id: task.parent_id, order: task.order, content: task.content });
                                        } else {
                                            taskList.push({ id: task.id, uid: "temp" });
                                        }
                                    }
                                }
                            }
                        } else {
                            if (task.hasOwnProperty('parent_id')) {
                                subTaskList.push({ id: task.id, parent_id: task.parent_id, order: task.order, content: task.content });
                            } else {
                                taskList.push({ id: task.id, uid: "temp" });
                            }
                        }
                    }

                    if (Object.keys(taskList).length > 0) {
                        if (!auto) {
                            await window.roamAlphaAPI.updateBlock({
                                block: {
                                    uid: thisBlock,
                                    string: TodoistHeader.toString()
                                }
                            });
                            //await window.roamAlphaAPI.updateBlock({"block": {"uid": thisBlock, "string": TodoistHeader}});
                        } else {
                            // get today's DNP uid
                            var today = new Date();
                            var dd = String(today.getDate()).padStart(2, '0');
                            var mm = String(today.getMonth() + 1).padStart(2, '0');
                            var yyyy = today.getFullYear();
                            autoParentUid = mm + '-' + dd + '-' + yyyy;
                            // find QC header
                            var results = await window.roamAlphaAPI.q(`[:find (pull ?page [:node/title :block/string :block/uid {:block/children ...} ]) :where [?page :block/uid "${autoParentUid}"] ]`);
                            if (results[0][0].hasOwnProperty("children") && results[0][0].children.length > 0) {
                                for (var i = 0; i < results[0][0].children.length; i++) {
                                    if (results[0][0].children[i].string == TodoistHeader) {
                                        var definitions = results[0][0]?.children[i];
                                        autoBlockUid = definitions.uid;
                                    }
                                }
                                if (definitions.hasOwnProperty("children") && definitions.children.length > 0) {
                                    autoBlockUidLength = definitions.children.length;
                                }
                            } else { // there isn't a QC header on this date yet, so create one
                                const uid = window.roamAlphaAPI.util.generateUID();
                                await window.roamAlphaAPI.createBlock({
                                    location: { "parent-uid": autoParentUid, order: 9999 },
                                    block: { string: TodoistHeader, uid }
                                });
                                autoBlockUid = uid;
                            }
                        }

                        for (var i = 0; i < taskList.length; i++) {
                            for await (task of JSON.parse(myTasks)) {
                                if (taskList[i].id == task.id) {
                                    // print task
                                    var itemString = "";
                                    if (TodoistOutputTodo == true) {
                                        itemString += "{{[[TODO]]}} "
                                    }
                                    itemString += "" + task.content + "";
                                    if (TodoistNoTag !== true) {
                                        itemString += " #[[" + TodoistImportTag + "]]";
                                    }
                                    if (TodoistCreatedDate == true) {
                                        var createdDate = task.created.split("T");
                                        itemString += " Created: [[" + convertToRoamDate(createdDate[0]) + "]]";
                                    }
                                    if (TodoistDueDates == true && task.hasOwnProperty('due')) {
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
                                    if (!auto) {
                                        await window.roamAlphaAPI.createBlock({
                                            location: { "parent-uid": thisBlock, order: i },
                                            block: { string: itemString, uid }
                                        });
                                    } else {
                                        await window.roamAlphaAPI.createBlock({
                                            location: { "parent-uid": autoBlockUid, order: i + autoBlockUidLength },
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
                                        var url = "https://api.todoist.com/rest/v1/comments?task_id=" + task.id + "";
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
                                }

                                var url = "https://api.todoist.com/rest/v1/tasks/" + task.id + "";
                                var requestOptionsDelete = {
                                    method: 'DELETE',
                                    headers: myHeaders,
                                    redirect: 'follow'
                                };
                                //await fetch(url, requestOptionsDelete);
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
            var checkEveryMinutes = extensionAPI.settings.get("uqcrr-auto-time");
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