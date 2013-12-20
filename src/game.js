function randomInt(n) {
  // random integer from 0..n-1
  return Math.floor(n * Math.random());
}

function clamp(n, min, max) {
  return Math.max(Math.min(n, max), min);
}

function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

function pad0(num, length) {
  var num = "" + num;
  while (num.length < length) {
    num = "0" + num;
  }
  return num;
}

function buildGettersSetters(obj) {
  if (!("simpleAttributes" in obj))
    return;

  function buildGetter(attr) {
    return function() { return this.get(attr); }
  }

  function buildSetter(attr) {
    return function(v) { this.set(attr, v); return v; }
  }

  for (var i = 0; i < obj.simpleAttributes.length; ++i) {
    var attr = obj.simpleAttributes[i];
    Object.defineProperty(obj, attr, {
      get: buildGetter(attr),
      set: buildSetter(attr)
    });
  }
}

// scale an element, while keeping it the same physical size
function scaleView(el, scale)
{

}

// A basic Card.  It only has the card's attributes;
// cardNum might be -1, in which case the card isn't known yet.
//
// Backbone models all have an internal id that's unique, so we
// can distinguish between different unknown cards for purposes
// of serialization.
//
// A card should only belong in one displayed view.
var Card = Backbone.Model.extend({
  defaults: {
    cardNum: -1,
    faceUp: true,
    tapped: false
  },

  simpleAttributes: [ "cardNum",
		      "frontImage", "backImage",
		      "faceUp", "tapped" ],

  constructor: function(options) {
    buildGettersSetters(this);
    Backbone.Model.prototype.constructor.call(this, options);
  },

  isKnown: function() {
    return this.cardNum != -1;
  },

  visibleFace: function() {
    return this.faceUp ? this.frontImage : this.backImage;
  },

  tap: function() { this.tapped = true; },
  untap: function() { this.tapped = false; },
});

// A collection of cards.
var CardSet = Backbone.Collection.extend({
  model: Card
});

// A stack of cards, along with some manipulations.
// Internally, it maintains a CardSet that represents
// its cards.  A card really should be in only one
// Stack at a time.
// XXX enforce this somehow.
var Stack = Backbone.Model.extend({
  constructor: function(options) {
    Object.defineProperty(this, "size", {
      get: function() { return this.cards.size(); }
    });

    Backbone.Model.prototype.constructor.call(this, options);
  },

  initialize: function() {
    this.cards = new CardSet;
  },

  addCard: function(card) {
    this.cards.add(card);
    return this;
  },

  addCards: function(cards) {
    cards.each(function(c) { this.cards.add(c); }, this);
    return this;
  },

  shuffle: function() {
    this.cards.reset(this.cards.shuffle());
    return this;
  },

  // Draw: Take and remove 1, N cards from the front
  draw1: function() {
    if (this.size == 0)
      return null;
    return this.cards.shift();
  },

  draw: function(n) {
    n = Math.min(n, this.size);
    var drawResult = new CardSet;
    while (n--)
      drawResult.add(this.cards.shift());
    return drawResult;
  },

  // like draw(), but draws random cards
  drawRandom1: function() {
    if (this.size == 0)
      return null;
    var m = this.cards.at(randomInt(this.size));
    this.cards.remove(m);
    return m;
  },

  drawRandom: function(n) {
    var drawResult;
    if (n >= this.size) {
      drawResult = this.cards.clone();
      this.cards.reset();
      return drawResult;
    }

    drawResult = new CardSet;
    for (var i = 0; i < n; ++i) {
      var m = this.cards.at(randomInt(this.size));
      this.cards.remove(m);
      drawResult.add(m);
    }
    return drawResult;
  },

  // Peek: Peek at 1, N cards from the front (don't remove)
  peek1: function() {
    if (this.size == 0)
      return null;
    return this.cards.at(0);
  },

  peek: function(n) {
    n = Math.min(n, this.size);
    var peekResult = new CardSet;
    for (var i = 0; i < n; ++i)
      peekResult.add(this.cards.at(i));
    return peekResult;
  },

  // like peek(), but peeks random cards
  // XXX todo jfc.
});

//
// Views
//

// A plain card.  Displays the currently visible face, rotated
// 90 degrees if tapped.
var CardView = Backbone.View.extend({
  tagName: "div",
  className: "card",
  scale: 0.5, // this should match the CSS scaling applied to this element

  initialize: function() {
    this.model.on('change', this.render, this);
    var self = this;
    this.$el.draggable({
      revert: "invalid",
      distance: 3,
      //grid: [5, 5],

/*
      // this is code that tries to take into account css scale
      start: function(event, ui) {
        ui.position.left = 0;
        ui.position.top = 0;
	console.log("start");
      },
      drag: function(event, ui) {
        var changeLeft = ui.position.left - ui.originalPosition.left;
        var newLeft = ui.originalPosition.left + changeLeft / self.scale;

        var changeTop = ui.position.top - ui.originalPosition.top;
        var newTop = ui.originalPosition.top + changeTop / self.scale;
        ui.position.left = newLeft;
        ui.position.top = newTop;
	console.log("now", newLeft, newTop, changeLeft);
      },
*/
    });
  },

  render: function() {
    this.$el.empty().append(this.templateFn());
    this.$el.css({
      "width": App.CARD_WIDTH + "px",
      "height": App.CARD_HEIGHT + "px",
      "background-image": "url(" + this.model.visibleFace() + ")"
    });
    return this;
  },

  templateFn: _.template(" \
    <div class='cardbuttons'> \
      <div class='cardbutton cardbutton-eye'></div> \
      <div class='cardbutton cardbutton-play'></div> \
    </div>"),

  events: {
    "click": "select",
    "click .cardbutton-eye": "flip",
    "click .cardbutton-play": "play",
  },

  flip: function(ev) {
    console.log("flip", ev);
    this.model.faceUp = !this.model.faceUp;
    return true;
  },

  select: function(ev) {
    console.log("select", ev);
    this.$el.toggleClass("selected");
    return true;
  },

  play: function(ev) {
  },
});

var HandView = Backbone.View.extend({
  tagName: "div",
  className: "hand",

  initialize: function() {
    console.log("this.model ", this.model);
    this.model.cards.on("add", this.render, this);
    this.model.cards.on("remove", this.render, this);

    this.$el.droppable({
      accept: ".card",
      hoverClass: "hand-card-drop-hover",
      drop: function(event, ui) {
        var cv = ui.draggable.backboneView();
        console.log("would drop ", cv);
      }
    });
  },

  render: function() {
    this.$el.empty();
    this.model.cards.each(function(card) {
      var cardView = new CardView({ model: card });
      this.$el.append(cardView.render().el);
    }, this);
    return this;
  },
});

var BoardModel = Backbone.Model.extend({
  defaults: {
  },

  width: 1000,
  height: 600,
  cards: null,
  cardPositions: null,

  initialize: function() {
    this.cards = new CardSet;
    this.cardPositions = [];
  },

  // put the given card in play, either in the middle of the play stack
  addCard: function(card, x, y) {
    // push the position first, because adding to the cards set will trigger
    // the view to get this card's position
    x = x === undefined ? Math.floor(width / 2) : x;
    y = y === undefined ? Math.floor(height / 2) : y;

    this.cardPositions.push(x);
    this.cardPositions.push(y);

    this.cards.append(card);

    this.trigger("cardAdded", card, this.cards.length - 1, x, y);
  },

  removeCard: function(card) {
    var i = this.cards.indexOf(card);
    if (i == -1) throw "Card not part of the board!";

    var ox = this.cardPositions[i*2+0];
    var oy = this.cardPositions[i*2+1];

    this.cards.remove(card);

    this.trigger("cardRemoved", card, i, ox, oy);

    return card;
  },

  moveCardTo: function(card, x, y) {
    var i = this.cards.indexOf(card);
    if (i == -1) throw "Card not part of the board!";

    var ox = this.cardPositions[i*2+0];
    var oy = this.cardPositions[i*2+1];

    this.cardPositions[i*2+0] = clamp(x, 0, this.width);
    this.cardPositions[i*2+1] = clamp(y, 0, this.height);

    this.trigger("cardMoved", card, i, x, y, ox, oy);
  },

  getCardPos: function(card) {
    var i = this.cards.indexOf(card);
    if (i == -1) return null;

    return [this.cardPositions[i*2+0], this.cardPositions[i*2+1]];
  }
});

var BoardView = Backbone.View.extend({
  tagName: "div",
  className: "board",

  initialize: function() {
    this.model.on('cardAdded', this.cardAdded, this);
    this.model.on('cardRemoved', this.cardRemoved, this);
    this.model.on('cardMoved', this.cardMoved, this);

    this.$el.droppable({
      accept: ".card",
      hoverClass: "board-card-drop-hover",
      drop: function(event, ui) {
        var cv = ui.draggable.backboneView();
        if (!cv)
          return;

        var m = cv.model;

        console.log("(board) would drop ", cv);
      }
    });
  },

  render: function() {
    this.$el.empty();
  },

  cardAdded: function(card, cardIndex, x, y) {
  },

  cardRemoved: function(card, cardIndex, x, y) {
  },

  cardMoved: function(card, cardIndex, x, y, ox, oy) {
  },
});

// all of our app globals
var App = {
  //CARD_WIDTH: 320,
  //CARD_HEIGHT: 450,
  CARD_WIDTH: 160,
  CARD_HEIGHT: 225,


  hand: null,
  deck: null,

  init: function() {
    this.hand = new Stack;
    this.deck = new Stack;
    this.board = new BoardModel;
  },
};

function getCard(num) {
  var P = "assets/anr/";
  return new Card({cardNum: num,
		   frontImage: P+"cards/card-" + pad0(num, 5) + ".jpg",
		   backImage: P+"runner-back.jpg"});
}

function setupGame() {
  App.init();

  var runnerDeck = [1, "01001", 3, "01002", 3, "01050", 1, "02035", 2, "01007", 3, "01008", 3, "01009", 2, "02003", 2, "01010", 3, "01012", 1, "01014", 3, "01051", 3, "02047", 3, "01006", 2, "02009", 3, "02022", 3, "02053", 2, "02054", 3, "01047"];
  for (var i = 0; i < runnerDeck.length / 2; ++i) {
    var count = runnerDeck[i*2];
    var cardnum = runnerDeck[i*2+1];
    for (var j = 0; j < count; ++j) {
      App.deck.addCard(getCard(parseInt(cardnum, 10)));
    }
  }

  // the first card is the identity
  App.identityCard = App.deck.draw1();
  var padnum = pad0(App.identityCard.cardNum, 5);
  var idset = padnum.substr(0,2);
  if (CardDetails[idset][padnum].type != "Identity") {
    alert("First card in deck is not an Identity!  Got: " + CardDetails[idset][padnum].type + " instead. Invalid deck.");
    return;
  }

  // build a view for the board
  App.boardView = new BoardView({model: App.board})
    .$el
    .appendTo("#table");

  // build a view for the identity
  App.identityCardView = new CardView({model: App.identityCard});
  App.identityCardView.render()
    .$el
    .addClass("identity-card")
    .appendTo("#table .board");

  // build a view for the hand
  App.handView = new HandView({model: App.hand});
  App.handView.render()
    .$el
    .appendTo("#table");

  // and then shuffle the deck
  App.deck.shuffle();
  App.hand.addCards(App.deck.draw(5));

  $("#drawone").click(function() {
    var card = App.deck.draw1();
    App.hand.addCard(card);
  });

  $("#discard1").click(function() {
    var c = App.hand.draw1();
  });
}

$(setupGame);
