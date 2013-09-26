function randomInt(n) {
  // random integer from 0..n-1
  return Math.floor(n * Math.random());
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

  initialize: function() {
    this.model.on('change', this.render, this);
    this.$el.draggable();
  },

  render: function() {
    this.$el.empty();
    this.$el.css({
      "width": App.CARD_WIDTH + "px",
      "height": App.CARD_HEIGHT + "px",
      "background-image": "url(" + this.model.visibleFace() + ")"
    });
    return this;
  },

  events: {
    "click": "flip"
  },

  flip: function() {
    this.model.faceUp = !this.model.faceUp;
  }
});

var HandView = Backbone.View.extend({
  tagName: "div",
  className: "hand",

  initialize: function() {
    console.log("this.model ", this.model);
    this.model.cards.on("add", this.render, this);
    this.model.cards.on("remove", this.render, this);
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

// all of our app globals
var App = {
  CARD_WIDTH: 320,
  CARD_HEIGHT: 450,

  hand: null,
  deck: null,

  init: function() {
    this.hand = new Stack;
    this.deck = new Stack;
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

  // build a view for the identity
  App.identityCardView = new CardView({model: App.identityCard});
  App.identityCardView.render()
    .$el
    .addClass("identity-card")
    .appendTo("#table");
  
  // now do the same for the handd
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
