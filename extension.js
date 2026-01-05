var TodoistAccount,
  TodoistImportTag,
  TodoistHeader,
  key,
  autoParentUid,
  autoBlockUid,
  TodoistAfterActionLabel;
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
          description:
            "Your API token from https://app.todoist.com/app/settings/integrations/developer",
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
          name: "Automatic Import",
          description: "Import items to the DNP automatically",
          action: {
            type: "switch",
            onChange: (evt) => {
              setAuto(evt);
            },
          },
        },
        {
          id: "uqcrr-auto-time",
          name: "Automatic Import interval",
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
          name: "Get Created Date",
          description: "Import the item created date",
          action: { type: "switch" },
        },
        {
          id: "uqcrr-due-dates",
          name: "Get Due Date",
          description: "Import the item due date",
          action: { type: "switch" },
        },
        {
          id: "uqcrr-priority",
          name: "Get Priority",
          description: "Import the item priority",
          action: { type: "switch" },
        },
        {
          id: "uqcrr-comments",
          name: "Get Comments",
          description: "Import the item comments",
          action: { type: "switch" },
        },
        {
          id: "uqcrr-labelsTags",
          name: "Import Labels",
          description: "Import Todoist labels as Roam Research tags",
          action: { type: "switch" },
        },
        {
          id: "uqcrr-labelsRename",
          name: "Replace underscore in labels",
          description: "Convert '_' to ' ' in imported labels",
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
      ],
    };
    extensionAPI.settings.panel.create(config);

    extensionAPI.ui.commandPalette.addCommand({
      label: "Import Quick Capture items from Todoist",
      callback: () => importTodoist(false),
    });

    function proxifyIfAvailable(targetUrl) {
      const proxy =
        window.roamAlphaAPI?.constants?.corsAnywhereProxyUrl ??
        roamAlphaAPI?.constants?.corsAnywhereProxyUrl;
      if (!proxy) return targetUrl;
      return `${proxy}/${targetUrl}`;
    }

    async function setAuto(evt) {
      if (evt.target.checked) {
        auto = true;
        autoDL();
      } else {
        auto = false;
        if (checkInterval > 0) clearInterval(checkInterval);
      }
    }

    if (extensionAPI.settings.get("uqcrr-auto") == true) {
      auto = true;
      autoDL();
    }

    async function importTodoist(auto) {
      const focused = window.roamAlphaAPI.ui.getFocusedBlock();
      thisBlock = (focused?.then ? (await focused) : focused)?.["block-uid"];

      var v1 = true;
      const TODOIST_PROP_KEY = "todoist_id";

      const normalizeProps = (props) => {
        if (!props) return {};
        if (typeof props === "object") return props;
        if (typeof props === "string") {
          try {
            return JSON.parse(props);
          } catch (e) {
            return {};
          }
        }
        return {};
      };
      
      const getTodoistIdFromProps = (props) => {
        const p = normalizeProps(props);
        return p["todoist_id"] ?? p[":todoist_id"] ?? p["::todoist_id"] ?? null;
      };

      const setTodoistIdProp = async (uid, todoistId) => {
        const pulled = window.roamAlphaAPI.data.pull("[:block/props]", [":block/uid", uid]);
        const existing = normalizeProps(pulled?.[":block/props"]);

        const next = { ...existing };
        delete next[":" + TODOIST_PROP_KEY];
        delete next["::" + TODOIST_PROP_KEY];
        next[TODOIST_PROP_KEY] = String(todoistId);

        await window.roamAlphaAPI.updateBlock({
          block: { uid, props: next },
        });
      };

      const findExistingTaskUidByProp = (existingItems, todoistId) => {
        const headerNode = existingItems?.[0]?.[0];
        const children = headerNode?.children || [];
        for (const child of children) {
          const id = getTodoistIdFromProps(child?.props);
          if (id != null && String(id) === String(todoistId)) return child.uid;
        }
        return null;
      };
      
      const getChildBlocks = async (parentUid) => {
        const res = await window.roamAlphaAPI.q(`
          [:find (pull ?c [:block/uid :block/string :block/props])
           :where
           [?p :block/uid "${parentUid}"]
           [?p :block/children ?c]]
        `);
        return res.map((r) => r[0]);
      };

      const childStringExists = async (parentUid, exactString) => {
        const needle = String(exactString || "").trim();
        if (!needle) return false;

        const kids = await getChildBlocks(parentUid);
        return kids.some((k) => String(k?.string || "").trim() === needle);
      };

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

          // ---- account ----
          if (!extensionAPI.settings.get("uqcrr-account")) {
            TodoistAccount = "Free";
          } else {
            const regex = /^(Free|Premium)$/;
            if (String(extensionAPI.settings.get("uqcrr-account")).match(regex)) {
              TodoistAccount = extensionAPI.settings.get("uqcrr-account");
            } else {
              key = "Acct";
              sendConfigAlert(key);
              break breakme;
            }
          }

          TodoistImportTag = extensionAPI.settings.get("uqcrr-import-tag") || "Quick Capture";
          TodoistHeader =
            extensionAPI.settings.get("uqcrr-import-header") || "Imported Quick Capture items:";

          const TodoistLabelMode = extensionAPI.settings.get("uqcrr-label-mode") == true;
          
          let todoistLabelName = null;
          if (TodoistLabelMode) {
            if (!extensionAPI.settings.get("uqcrr-label-id")) {
              key = "label";
              sendConfigAlert(key);
              break breakme;
            } else {
              todoistLabelName = extensionAPI.settings.get("uqcrr-label-id");
            }
          }

          const TodoistOutputTodo = extensionAPI.settings.get("uqcrr-output-todo") === true;
          const TodoistGetDescription = extensionAPI.settings.get("uqcrr-get-description") === true;
          const TodoistNoTag = extensionAPI.settings.get("uqcrr-no-tag") === true;
          const TodoistLabelsasTags = extensionAPI.settings.get("uqcrr-labelsTags") === true;
          const TodoistLabelsRename = extensionAPI.settings.get("uqcrr-labelsRename") === true;
          const TodoistCreatedDate = extensionAPI.settings.get("uqcrr-created-date") === true;
          const TodoistDueDates = extensionAPI.settings.get("uqcrr-due-dates") === true;
          const TodoistPriority = extensionAPI.settings.get("uqcrr-priority") === true;
          const TodoistAfterAction = extensionAPI.settings.get("uqcrr-afterImport");
          const TodoistComments = extensionAPI.settings.get("uqcrr-comments") === true;

          if (TodoistAfterAction == "Label") {
            TodoistAfterActionLabel =
              extensionAPI.settings.get("uqcrr-afterImportLabel") || "Exported_to_Roam";
          }

          // v1 tasks via proxy (may fail in some accounts/ids; fall back to REST v2)
          const target = `https://api.todoist.com/api/v1/tasks?project_id=${encodeURIComponent(
            TodoistInboxId
          )}${TodoistLabelMode && todoistLabelName ? `&label=${encodeURIComponent(todoistLabelName)}` : ""}`;
          console.log("Fetching Todoist tasks from: ", target);
          const url = proxifyIfAvailable(target);

          const myHeaders = new Headers();
          myHeaders.append("Authorization", "Bearer " + myToken);
          myHeaders.append("Content-Type", "application/json");

          const headersGet = new Headers();
          headersGet.append("Authorization", `Bearer ${myToken}`);

          const requestOptionsGet = { method: "GET", headers: headersGet, redirect: "follow" };

          let tasks = [];
          let comments = [];
          let response;

          try {
            response = await fetch(url, requestOptionsGet);

            if (!response.ok) {
              let errPayload = null;
              try {
                errPayload = await response.json();
              } catch (e) { }
              console.warn(
                "Todoist v1 tasks failed:",
                response.status,
                response.statusText,
                errPayload
              );
              throw new Error(`Todoist v1 tasks failed: ${response.status}`);
            }

            const payload = await response.json();
            console.log("Todoist fetch response payload: ", payload);
            tasks = Array.isArray(payload) ? payload : payload?.results ?? [];
          } catch (e) {
            console.info("v1 fetch failed, falling back to REST v2 /tasks?project_id=", e);
            v1 = false;

            try {
              const res2 = await fetch(
                proxifyIfAvailable(
                  "https://api.todoist.com/rest/v2/tasks?project_id=" +
                  encodeURIComponent(TodoistInboxId)
                ),
                requestOptionsGet
              );

              if (!res2.ok) throw new Error(`Todoist v2 filtered failed: ${res2.status}`);
              tasks = await res2.json();
            } catch (e2) {
              console.info("v2 filtered fetch failed; falling back to unfiltered v2 + client filter", e2);

              const res3 = await fetch(
                proxifyIfAvailable("https://api.todoist.com/rest/v2/tasks"),
                requestOptionsGet
              );
              if (!res3.ok) throw new Error(`Todoist v2 unfiltered failed: ${res3.status}`);

              const all = await res3.json();
              tasks = (Array.isArray(all) ? all : []).filter(
                (t) => String(t.project_id) === String(TodoistInboxId)
              );

              if (TodoistLabelMode && todoistLabelName) {
                tasks = tasks.filter(
                  (t) => Array.isArray(t.labels) && t.labels.includes(todoistLabelName)
                );
              }
            }
          }
          console.info(`Fetched ${tasks.length} tasks from Todoist`);

          // Keep this fetch only for legacy + future use, but do not depend on it for correctness.
          let myLabels = [];
          if (TodoistAfterAction == "Label" || TodoistLabelsasTags) {
            try {
              const labelUrl = "https://api.todoist.com/api/v1/labels";
              const responseLabels = await fetch(proxifyIfAvailable(labelUrl), requestOptionsGet);
              if (!responseLabels.ok) throw new Error(`Labels fetch failed: ${responseLabels.status}`);
              const labelsPayload = await responseLabels.json();
              myLabels = Array.isArray(labelsPayload) ? labelsPayload : labelsPayload?.results ?? [];
            } catch (e) {
              console.info("Labels fetch failed; continuing without labels metadata", e);
              myLabels = [];
            }
          }

          var existingItems;

          if (tasks.length > 0) {
            let headerUidForChildren = thisBlock;

            if (!auto && !thisBlock) {
              alert("Please focus a block to import tasks from Todoist.");
              return;
            } else if (!auto) {
              await window.roamAlphaAPI.updateBlock({
                block: { uid: thisBlock, string: TodoistHeader.toString() },
              });

              existingItems = await window.roamAlphaAPI.q(
                `[:find (pull ?page
                    [:node/title :block/string :block/uid
                     {:block/children [:block/uid :block/string :block/props {:block/children ...}]}])
                  :where [?page :block/uid "${thisBlock}"] ]`
              );
            } else {
              // get today's DNP uid
              var today = new Date();
              var dd = String(today.getDate()).padStart(2, "0");
              var mm = String(today.getMonth() + 1).padStart(2, "0");
              var yyyy = today.getFullYear();
              autoParentUid = mm + "-" + dd + "-" + yyyy;

              // find or create QC header
              autoBlockUid = (
                await window.roamAlphaAPI.q(
                  `[:find ?u
                    :where
                    [?b :block/page ?p]
                    [?b :block/uid ?u]
                    [?b :block/string "${TodoistHeader}"]
                    [?p :block/uid "${autoParentUid}"]]`
                )
              )?.[0]?.[0];

              if (autoBlockUid == undefined) {
                const uid = window.roamAlphaAPI.util.generateUID();
                await window.roamAlphaAPI.createBlock({
                  location: { "parent-uid": autoParentUid, order: 9999 },
                  block: { string: TodoistHeader, uid },
                });
                autoBlockUid = uid;
              }

              autoBlockUidLength = (
                await window.roamAlphaAPI.q(
                  `[:find ?c :where [?e :block/children ?c] [?e :block/uid "${autoBlockUid}"]]`
                )
              ).length;

              headerUidForChildren = autoBlockUid;

              existingItems = await window.roamAlphaAPI.q(
                `[:find (pull ?page
                    [:node/title :block/string :block/uid
                     {:block/children [:block/uid :block/string :block/props {:block/children ...}]}])
                  :where [?page :block/uid "${autoBlockUid}"] ]`
              );
            }

            const rootTasks = tasks.filter((t) => !t.parent_id);
            const subTasks = tasks.filter((t) => t.parent_id);

            const sortByOrder = (a, b) => {
              const ao = a.child_order ?? a.order ?? 0;
              const bo = b.child_order ?? b.order ?? 0;
              return ao - bo;
            };

            rootTasks.sort(sortByOrder);
            subTasks.sort(sortByOrder);

            // seed map from EXISTING header children (props)
            const roamUidByTaskId = new Map();
            {
              const headerNode = existingItems?.[0]?.[0];
              const children = headerNode?.children || [];
              for (const child of children) {
                const id = getTodoistIdFromProps(child?.props);
                if (id) roamUidByTaskId.set(String(id), child.uid);
              }
            }

            const buildItemString = (task) => {
              let itemString = "";
              if (TodoistOutputTodo === true) itemString += "{{[[TODO]]}} ";
              itemString += "" + task.content + "";
              if (TodoistNoTag !== true) itemString += " #[[" + TodoistImportTag + "]]";

              // Import labels directly from the task (REST v2 uses label names)
              if (TodoistLabelsasTags === true && Array.isArray(task.labels) && task.labels.length > 0) {
                for (const labelName of task.labels) {
                  if (!labelName) continue;
                  if (TodoistAfterActionLabel && labelName === TodoistAfterActionLabel) continue;

                  const roamLabel = TodoistLabelsRename
                    ? String(labelName).replaceAll("_", " ")
                    : String(labelName);

                  if (TodoistLabelsRename) itemString += " #[[" + roamLabel + "]]";
                  else itemString += " #" + roamLabel;
                }
              }

              if (TodoistCreatedDate === true) {
                const createdRaw = task.created_at || task.added_at || task.updated_at;
                if (createdRaw) {
                  const createdDate = createdRaw.split("T");
                  itemString += " Created: [[" + convertToRoamDate(createdDate[0]) + "]]";
                }
              }

              if (TodoistDueDates === true && task.due != null) {
                itemString += " Due: [[" + convertToRoamDate(task.due.date) + "]]";
              }

              if (TodoistPriority === true) {
                const p = String(task.priority);
                let priority;
                if (p == "4") priority = "1";
                else if (p == "3") priority = "2";
                else if (p == "2") priority = "3";
                else if (p == "1") priority = "4";
                if (priority) itemString += " #Priority-" + priority;
              }

              return itemString;
            };

            // ---- 1) create/update root tasks ----
            for (let i = 0; i < rootTasks.length; i++) {
              const task = rootTasks[i];

              const matchedUid =
                roamUidByTaskId.get(String(task.id)) || findExistingTaskUidByProp(existingItems, task.id);

              const newUid = window.roamAlphaAPI.util.generateUID();
              const itemString = buildItemString(task);

              let finalUid;

              if (matchedUid) {
                await window.roamAlphaAPI.updateBlock({
                  block: { uid: matchedUid, string: itemString.toString() },
                });
                finalUid = matchedUid;
              } else {
                if (auto) {
                  await window.roamAlphaAPI.createBlock({
                    location: {
                      "parent-uid": headerUidForChildren,
                      order: i + (auto ? autoBlockUidLength : 0),
                    },
                    block: { string: itemString, uid: newUid },
                  });
                } else {
                  await window.roamAlphaAPI.createBlock({
                    location: { "parent-uid": thisBlock, order: i },
                    block: { string: itemString, uid: newUid },
                  });
                }
                finalUid = newUid;
              }

              await setTodoistIdProp(finalUid, task.id);
              roamUidByTaskId.set(String(task.id), finalUid);

              // description
              if (TodoistGetDescription === true && task.description) {
                if (!(await childStringExists(finalUid, task.description))) {
                  const descUid = window.roamAlphaAPI.util.generateUID();
                  await window.roamAlphaAPI.createBlock({
                    location: { "parent-uid": finalUid, order: 1 },
                    block: { string: task.description, uid: descUid },
                  });
                }
              }

              // comments
              if (TodoistComments === true) {
                const COMMENT_PROP_KEY = "todoist_comment_id";

                const getTodoistCommentIdFromProps = (props) => {
                  if (!props) return null;
                  if (typeof props === "string") {
                    try {
                      props = JSON.parse(props);
                    } catch (e) {
                      return null;
                    }
                  }
                  return (
                    props[COMMENT_PROP_KEY] ??
                    props[":" + COMMENT_PROP_KEY] ??
                    props["::" + COMMENT_PROP_KEY] ??
                    null
                  );
                };

                const setTodoistCommentIdProp = async (uid, commentId) => {
                  const pulled = window.roamAlphaAPI.data.pull("[:block/props]", [":block/uid", uid]);
                  const existing =
                    pulled && pulled[":block/props"] && typeof pulled[":block/props"] === "object"
                      ? pulled[":block/props"]
                      : {};

                  const next = { ...existing };
                  delete next[":" + COMMENT_PROP_KEY];
                  delete next["::" + COMMENT_PROP_KEY];
                  next[COMMENT_PROP_KEY] = String(commentId);

                  await window.roamAlphaAPI.updateBlock({ block: { uid, props: next } });
                };

                const commentChildUidById = async (parentUid, commentId) => {
                  const res = await window.roamAlphaAPI.q(`
                    [:find (pull ?c [:block/uid :block/props])
                     :where
                     [?p :block/uid "${parentUid}"]
                     [?p :block/children ?c]]
                  `);
                  const kids = res.map((r) => r[0]);
                  for (const k of kids) {
                    const id = getTodoistCommentIdFromProps(k?.props);
                    if (id && String(id) === String(commentId)) return k.uid;
                  }
                  return null;
                };

                try {
                  if (v1) {
                    const commentsTarget = "https://api.todoist.com/api/v1/comments?task_id=" + task.id;
                    const commentsUrl = proxifyIfAvailable(commentsTarget);
                    const responseComments = await fetch(commentsUrl, requestOptionsGet);
                    if (!responseComments.ok)
                      throw new Error(`Todoist v1 comments failed: ${responseComments.status}`);
                    const commentsPayload = await responseComments.json();
                    comments = Array.isArray(commentsPayload) ? commentsPayload : commentsPayload?.results ?? [];
                  } else {
                    const v2Url = "https://api.todoist.com/rest/v2/comments?task_id=" + task.id;
                    const responseV2 = await fetch(proxifyIfAvailable(v2Url), requestOptionsGet);
                    if (!responseV2.ok)
                      throw new Error(`Todoist v2 comments failed: ${responseV2.status}`);
                    comments = await responseV2.json();
                  }
                } catch (e) {
                  console.info("Comments fetch failed; continuing without comments for task " + task.id, e);
                  comments = [];
                }

                for (let j = 0; j < comments.length; j++) {
                  const c = comments[j];
                  if (c?.is_deleted) continue;

                  let commentString = "";

                  const att = c?.attachment || c?.file_attachment;

                  if (att && TodoistAccount === "Premium") {
                    if (att?.file_type === "application/pdf") {
                      commentString = "{{pdf: " + att?.file_url + "}}";
                    } else if (att?.file_type === "image/jpeg" || att?.file_type === "image/png") {
                      commentString = "![](" + att?.file_url + ")";
                    } else {
                      commentString = String(c?.content || "");
                    }
                  } else if (att) {
                    if (att?.file_type === "text/html") {
                      commentString = String(c?.content || "") + " [Email Body](" + att?.file_url + ")";
                    } else {
                      commentString = String(c?.content || "");
                    }
                  } else {
                    commentString = String(c?.content || "");
                  }

                  commentString = commentString.trim();
                  if (!commentString) continue;

                  const existingCommentUid = await commentChildUidById(finalUid, c.id);
                  if (existingCommentUid) continue;

                  const newCommentUid = window.roamAlphaAPI.util.generateUID();
                  await window.roamAlphaAPI.createBlock({
                    location: { "parent-uid": finalUid, order: j + 1 },
                    block: { string: commentString, uid: newCommentUid },
                  });

                  await setTodoistCommentIdProp(newCommentUid, c.id);
                }
              }

              // After-action (prefer v1; fallback to REST v2 if v1 fails)
              const v1TaskUrl = proxifyIfAvailable("https://api.todoist.com/api/v1/tasks/" + task.id);
              const v2TaskUrl = proxifyIfAvailable("https://api.todoist.com/rest/v2/tasks/" + task.id);

              const tryFetch = async (url, opts) => {
                try {
                  const r = await fetch(url, opts);
                  return r;
                } catch (e) {
                  return { ok: false, status: 0, _err: e };
                }
              };

              if (TodoistAfterAction == "Delete") {
                // v1 DELETE -> v2 DELETE
                const r1 = await tryFetch(v1TaskUrl, { method: "DELETE", headers: headersGet, redirect: "follow" });
                if (!r1.ok) {
                  if (r1._err) console.warn("After-action DELETE (v1) threw:", r1._err);
                  else console.warn("After-action DELETE (v1) failed:", r1.status);

                  const r2 = await tryFetch(v2TaskUrl, { method: "DELETE", headers: headersGet, redirect: "follow" });
                  if (!r2.ok) {
                    if (r2._err) console.warn("After-action DELETE (v2) threw:", r2._err);
                    else console.warn("After-action DELETE (v2) failed:", r2.status);
                  }
                }
              } else if (TodoistAfterAction == "Label") {
                // v1 "labels" update -> v2 update
                const newLabels = [
                  TodoistAfterActionLabel,
                  ...(Array.isArray(task.labels) ? task.labels : []),
                ].filter(Boolean);

                // v1 POST
                const r1 = await tryFetch(v1TaskUrl, {
                  method: "POST",
                  headers: myHeaders,
                  redirect: "follow",
                  body: JSON.stringify({ labels: newLabels }),
                });

                if (!r1.ok) {
                  if (r1._err) console.warn("After-action LABEL (v1) threw:", r1._err);
                  else console.warn("After-action LABEL (v1) failed:", r1.status);

                  // REST v2 expects POST to /tasks/{id} (update task)
                  const r2 = await tryFetch(v2TaskUrl, {
                    method: "POST",
                    headers: myHeaders,
                    redirect: "follow",
                    body: JSON.stringify({ labels: newLabels }),
                  });

                  if (!r2.ok) {
                    if (r2._err) console.warn("After-action LABEL (v2) threw:", r2._err);
                    else console.warn("After-action LABEL (v2) failed:", r2.status);
                  }
                }
              }
            }

            // ---- 2) create subtasks under their parent blocks (deduped) ----
            for (let k = 0; k < subTasks.length; k++) {
              const st = subTasks[k];
              const parentRoamUid = roamUidByTaskId.get(String(st.parent_id));
              if (!parentRoamUid) continue;

              if (await childStringExists(parentRoamUid, st.content)) continue;

              const pulled = window.roamAlphaAPI.data.pull("[:block/children]", [":block/uid", parentRoamUid]);
              let children = 0;
              if (pulled != null) children = pulled[":block/children"].length;

              const newUid = window.roamAlphaAPI.util.generateUID();
              await window.roamAlphaAPI.createBlock({
                location: { "parent-uid": parentRoamUid, order: children + 1 },
                block: { string: st.content, uid: newUid },
              });
            }
          } else {
            if (!auto) alert("No items to import");
          }
        }
      }
    }

    async function autoDL() {
      const regex = /^\d{1,2}$/;
      var checkEveryMinutes = 15;
      if (regex.test(extensionAPI.settings.get("uqcrr-auto-time"))) {
        checkEveryMinutes = parseInt(extensionAPI.settings.get("uqcrr-auto-time"));
      }
      setTimeout(async () => {
        await importTodoist(auto);
        try {
          if (checkInterval > 0) clearInterval(checkInterval);
        } catch (e) { }
        checkInterval = setInterval(async () => {
          await importTodoist(auto);
        }, checkEveryMinutes * 60000);
      }, 10000);
    }
  },
  onunload: () => {
    if (checkInterval > 0) clearInterval(checkInterval);
  },
};

function convertToRoamDate(dateString) {
  var parsedDate = dateString.split("-");
  var year = parsedDate[0];
  var month = Number(parsedDate[1]);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  var monthName = months[month - 1];
  var day = Number(parsedDate[2]);
  let suffix =
    (day >= 4 && day <= 20) || (day >= 24 && day <= 30) ? "th" : ["st", "nd", "rd"][day % 10 - 1];
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
