import * as functions from "firebase-functions";
import { dialogflow, DialogflowConversation, Image } from "actions-on-google";
import * as admin from "firebase-admin";
const app: any = dialogflow();
admin.initializeApp();
const db = admin.database();

//Robot Ronny
//verze: Brno

const storage = admin.storage();

app.intent("read", (conv: DialogflowConversation) => {
  let ref = db.ref("sensors/ronny");
  return ref.once("value", snapshots => {
    if (snapshots.exists) {
      let data = snapshots.val();

      let response = `<speak>I am fine, the temperature is ${
        data.temperature
      } °C and the illuminance is ${data.illuminance} lumen.</speak>`;

      return conv.ask(response);
    } else {
      return conv.ask(`I have no data...`);
    }
  });
});

app.intent("image", async (conv: DialogflowConversation) => {
  let bucket = storage.bucket();
  let response = await bucket.file("image.PNG").get();
  let reference = response[1] as any;
  let ids = reference["id"].split("/");
  let url: string = `https://firebasestorage.googleapis.com/v0/b/${
    reference["bucket"]
  }/o/${ids[1]}?alt=media&token=${
    reference["metadata"]["firebaseStorageDownloadTokens"]
  }`;

  if (conv.screen) {
    conv.ask(`Here is what I see right now!`);
    return conv.ask(
      new Image({
        url: url,
        alt: `Ronny vision`
      })
    );
  } else {
    return conv.ask(
      `Sorry, you don't have a display for me to show you, what can I do for you next?`
    );
  }
});

app.intent(
  "move",
  (
    conv: DialogflowConversation,
    { length, dir }: { length: string; dir: string }
  ) => {
    let commands = db.ref("commands/go");
    let direction = dir;
    let data: any = { direction: direction };
    length ? (data["value"] = length) : null;

    return commands
      .update(data)
      .then(result => {
        // tslint:disable-next-line:no-parameter-reassignment
        length = length || "last length";
        return conv.ask(`I have moved ${length} to ${dir}`);
      })
      .catch(error => {
        console.log(error);
        return conv.ask(`Something went wrong, please try again... `);
      });
  }
);

app.intent(
    "hands",
    (
      conv: DialogflowConversation,
      { updown, hand, degree }: { updown: string; hand: string, degree: string }
    ) => {
      let commands = db.ref("commands/hands");  
      let data: any = { updown: updown };
      if(hand) {
          data["hand"] = hand;
      }
      if(degree) {
          data["degrees"] = degree;
      }
        console.log(`Data ${data}`);
      return commands
        .update(data)
        .then(result => {
          return conv.ask(`I have moved the ${(hand) ? hand.toLowerCase() : 'same'} hand by ${(degree ? degree.toLowerCase() : 'same degree')} ${updown.toLowerCase()}`);
        })
        .catch(error => {
          console.log(error);
          return conv.ask(`Something went wrong, please try again... `);
        });
    }
  );

export const dialogflowFirebaseFulfillment = functions.https.onRequest(app);
