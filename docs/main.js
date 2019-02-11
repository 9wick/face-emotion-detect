var targetVideoId = '';
var videoShowing = false;

var config = {
  apiKey: "AIzaSyAYBSrPymSdfp_kChgqb1Ax8rwcbhaq5ho",
  authDomain: "emotion-detect-bf09d.firebaseapp.com",
  databaseURL: "https://emotion-detect-bf09d.firebaseio.com",
  projectId: "emotion-detect-bf09d",
  storageBucket: "emotion-detect-bf09d.appspot.com",
  messagingSenderId: "419522166698"
};
firebase.initializeApp(config);
faceEmotionCondition = [];


// Initialize Cloud Firestore through Firebase
var db = firebase.firestore();

db.collection("config").doc("site").get().then((doc) => {
  if(doc.exists){
    setupTitle(doc.data().title || "title")
  };
});


db.collection("condition").get().then((querySnapshot) => {
  querySnapshot.forEach((doc) => {
    faceEmotionCondition.push(doc.data());
  });
})


$(document).ready(function () {
  startVideo();
  var player;


// when the modal is opened autoplay it
  $('#myModal').on('shown.bs.modal', function (e) {
    console.log("show video")
    videoShowing = true;
// set the video src to autoplay and not to show related video. Youtube related video is like a box of chocolates... you never know what you're gonna get
    //  $("#video").attr('src', $videoSrc + "?rel=0&amp;showinfo=0&amp;modestbranding=1&amp;autoplay=1");
    // 3. This function creates an <iframe> (and YouTube player)
    //    after the API code downloads.
    stopVideo();
    player = new YT.Player('player', {
      height: '360',
      width: '640',
      videoId: targetVideoId,
      events: {
        'onReady': onPlayerReady,
        'onStateChange': onPlayerStateChange
      }
    });

    function onPlayerStateChange(event) {
      if (event.data == YT.PlayerState.ENDED) {
        $('#myModal').modal('hide');
      }
    }

  });

  function onPlayerReady(event) {
    event.target.playVideo();
  }

  function stopVideo() {
    if (player) {
      player.stopVideo();
      player.destroy();
      player = undefined;
    }
  }

// stop playing the youtube video when I close the modal
  $('#myModal').on('hidden.bs.modal', function (e) {
    stopVideo();
    videoShowing = false;
    console.log("hide video")
  })


// document ready
});

function setupTitle(text) {
  var title = document.getElementById("title");
  title.innerText = text;
  var headTitle = document.getElementById("head-title");
  headTitle.innerText = text;

}

function startVideo() {

// もろもろの準備
  var video = document.getElementById("camera");           // video 要素を取得
  var canvas = document.getElementById("canvas");         // canvas 要素の取得
  var context = canvas.getContext("2d");                  // canvas の context の取得


  let mediaDevices = navigator.mediaDevices || ((navigator.mozGetUserMedia || navigator.webkitGetUserMedia || navigator.msGetUserMedia) ? {
    getUserMedia(c) {
      return new Promise(((y, n) => {
        (navigator.mozGetUserMedia || navigator.webkitGetUserMedia).call(navigator, c, y, n);
      }));
    }
  } : null);

// getUserMedia によるカメラ映像の取得
  var media = mediaDevices.getUserMedia({       // メディアデバイスを取得
    video: {facingMode: "user"},                          // カメラの映像を使う（スマホならインカメラ）
    audio: false                                          // マイクの音声は使わない
  });
  media.then((stream) => {                                // メディアデバイスが取得できたら
    video.srcObject = stream;
// video.src = window.URL.createObjectURL(stream);       // video 要素にストリームを渡す
  });

// clmtrackr の開始
  var tracker = new clm.tracker();  // tracker オブジェクトを作成
  tracker.init(pModel);             // tracker を所定のフェイスモデル（※1）で初期化
  tracker.start(video);             // video 要素内でフェイストラッキング開始

// 感情分類の開始
  var classifier = new emotionClassifier();               // ★emotionClassifier オブジェクトを作成
  classifier.init(emotionModel);                          // ★classifier を所定の感情モデル（※2）で初期化

// 描画ループ
  function drawLoop() {
    requestAnimationFrame(drawLoop);                      // drawLoop 関数を繰り返し実行

    var positions = tracker.getCurrentPosition();         // 顔部品の現在位置の取得
    var parameters = tracker.getCurrentParameters();      // ★現在の顔のパラメータを取得
    var emotion = classifier.meanPredict(parameters);     // ★そのパラメータから感情を推定して emotion に結果を入れる
    emotionCallback(emotion);                             // ★感情データを表示
    context.clearRect(0, 0, canvas.width, canvas.height); // canvas をクリア
    tracker.draw(canvas);                                 // canvas にトラッキング結果を描画
  }

  drawLoop();                                             // drawLoop 関数をトリガー

// ★感情データの表示

}

function emotionCallback(emo) {
  var emoObj = {};
  var str = "";
  for (var i = 0; i < emo.length; i++) {
    emoObj[emo[i].emotion] = emo[i].value;
  }

  showEmotionData(emoObj);
  checkEmotion(emoObj);
}


function showEmotionData(emo) {
  var str = "";                                          // データの文字列を入れる変数
  for (var e in emo) {
    str += e + ": " + emo[e].toFixed(2) + "<br/>";
  }
  var dat = document.getElementById("dat");             // データ表示用div要素の取得
  dat.innerHTML = str;                                  // データ文字列の表示
}

function showMovie(id) {
  if (!videoShowing) {
    targetVideoId = id;
    $('#myModal').modal('show');
  }

}

function checkEmotion(capturedEmotion) {
  if(videoShowing){return;}
  for( var condition of faceEmotionCondition){
    if( checkEmotionOne(capturedEmotion, condition.emotion)){
      showMovie(condition.video);
      return;
    }

  }
}

function checkEmotionOne(capturedEmotion, conditionData){
  for(var emotion in conditionData){
    let condition =  conditionData[emotion];
    if(condition[">"]){
      if( !(capturedEmotion[emotion] > condition[">"])){
        return false;
      }
    } if(condition["<"]){
      if( !(capturedEmotion[emotion] < condition["<"])){
        return false;
      }
    }
  }
  return true;
}