import type { TestItem } from '@/types';

const choice = `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    identifier="sample-choice" title="Choice" adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
    <qti-correct-response>
      <qti-value>choice_b</qti-value>
    </qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
    <qti-default-value><qti-value>0</qti-value></qti-default-value>
  </qti-outcome-declaration>
  <qti-item-body>
    <qti-choice-interaction response-identifier="RESPONSE" shuffle="false" max-choices="1">
      <qti-prompt>Which planet is known as the Red Planet?</qti-prompt>
      <qti-simple-choice identifier="choice_a">Venus</qti-simple-choice>
      <qti-simple-choice identifier="choice_b">Mars</qti-simple-choice>
      <qti-simple-choice identifier="choice_c">Jupiter</qti-simple-choice>
    </qti-choice-interaction>
  </qti-item-body>
  <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"/>
</qti-assessment-item>`;

const order = `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    identifier="sample-order" title="Order" adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="ordered" base-type="identifier">
    <qti-correct-response>
      <qti-value>step_1</qti-value>
      <qti-value>step_2</qti-value>
      <qti-value>step_3</qti-value>
    </qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
    <qti-default-value><qti-value>0</qti-value></qti-default-value>
  </qti-outcome-declaration>
  <qti-item-body>
    <qti-order-interaction response-identifier="RESPONSE" shuffle="true">
      <qti-prompt>Put these steps of the water cycle in order.</qti-prompt>
      <qti-simple-choice identifier="step_1">Evaporation</qti-simple-choice>
      <qti-simple-choice identifier="step_2">Condensation</qti-simple-choice>
      <qti-simple-choice identifier="step_3">Precipitation</qti-simple-choice>
    </qti-order-interaction>
  </qti-item-body>
  <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"/>
</qti-assessment-item>`;

const match = `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    identifier="sample-match" title="Match" adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="directedPair">
    <qti-correct-response>
      <qti-value>dog kennel</qti-value>
      <qti-value>bird nest</qti-value>
      <qti-value>bee hive</qti-value>
    </qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
    <qti-default-value><qti-value>0</qti-value></qti-default-value>
  </qti-outcome-declaration>
  <qti-item-body>
    <qti-match-interaction response-identifier="RESPONSE" shuffle="false" max-associations="3">
      <qti-prompt>Match each animal to where it lives.</qti-prompt>
      <qti-simple-match-set>
        <qti-simple-associable-choice identifier="dog" match-max="1">Dog</qti-simple-associable-choice>
        <qti-simple-associable-choice identifier="bird" match-max="1">Bird</qti-simple-associable-choice>
        <qti-simple-associable-choice identifier="bee" match-max="1">Bee</qti-simple-associable-choice>
      </qti-simple-match-set>
      <qti-simple-match-set>
        <qti-simple-associable-choice identifier="kennel" match-max="1">Kennel</qti-simple-associable-choice>
        <qti-simple-associable-choice identifier="nest" match-max="1">Nest</qti-simple-associable-choice>
        <qti-simple-associable-choice identifier="hive" match-max="1">Hive</qti-simple-associable-choice>
      </qti-simple-match-set>
    </qti-match-interaction>
  </qti-item-body>
  <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"/>
</qti-assessment-item>`;

const gapMatch = `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    identifier="sample-gap-match" title="Gap Match" adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="directedPair">
    <qti-correct-response>
      <qti-value>word_sun star</qti-value>
      <qti-value>word_moon planet</qti-value>
    </qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
    <qti-default-value><qti-value>0</qti-value></qti-default-value>
  </qti-outcome-declaration>
  <qti-item-body>
    <qti-gap-match-interaction response-identifier="RESPONSE" shuffle="false" max-associations="2">
      <qti-prompt>Drag each word into the correct gap.</qti-prompt>
      <qti-gap-text identifier="word_sun" match-max="1">Sun</qti-gap-text>
      <qti-gap-text identifier="word_moon" match-max="1">Moon</qti-gap-text>
      <p>The <qti-gap identifier="star"/> is a star. The <qti-gap identifier="planet"/> orbits a planet.</p>
    </qti-gap-match-interaction>
  </qti-item-body>
  <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"/>
</qti-assessment-item>`;

const hottext = `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    identifier="sample-hottext" title="Hottext" adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="identifier">
    <qti-correct-response>
      <qti-value>noun_dog</qti-value>
      <qti-value>noun_park</qti-value>
    </qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
    <qti-default-value><qti-value>0</qti-value></qti-default-value>
  </qti-outcome-declaration>
  <qti-item-body>
    <qti-hottext-interaction response-identifier="RESPONSE" max-choices="0">
      <qti-prompt>Select all the nouns in this sentence.</qti-prompt>
      <p>
        The <qti-hottext identifier="noun_dog">dog</qti-hottext> ran
        quickly through the <qti-hottext identifier="noun_park">park</qti-hottext>.
      </p>
    </qti-hottext-interaction>
  </qti-item-body>
  <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"/>
</qti-assessment-item>`;

const inlineChoice = `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    identifier="sample-inline-choice" title="Inline Choice" adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
    <qti-correct-response>
      <qti-value>fr</qti-value>
    </qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
    <qti-default-value><qti-value>0</qti-value></qti-default-value>
  </qti-outcome-declaration>
  <qti-item-body>
    <p>The capital of France is
      <qti-inline-choice-interaction response-identifier="RESPONSE" shuffle="false">
        <qti-inline-choice identifier="de">Berlin</qti-inline-choice>
        <qti-inline-choice identifier="fr">Paris</qti-inline-choice>
        <qti-inline-choice identifier="it">Rome</qti-inline-choice>
      </qti-inline-choice-interaction>.
    </p>
  </qti-item-body>
  <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"/>
</qti-assessment-item>`;

const textEntry = `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    identifier="sample-text-entry" title="Text Entry" adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string">
    <qti-correct-response>
      <qti-value>Paris</qti-value>
    </qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
    <qti-default-value><qti-value>0</qti-value></qti-default-value>
  </qti-outcome-declaration>
  <qti-item-body>
    <p>The capital of France is
      <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="10"/>.
    </p>
  </qti-item-body>
  <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"/>
</qti-assessment-item>`;

const extendedText = `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    identifier="sample-extended-text" title="Extended Text" adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string"/>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
    <qti-default-value><qti-value>0</qti-value></qti-default-value>
  </qti-outcome-declaration>
  <qti-item-body>
    <qti-extended-text-interaction response-identifier="RESPONSE" expected-lines="5">
      <qti-prompt>Describe the water cycle in your own words.</qti-prompt>
    </qti-extended-text-interaction>
  </qti-item-body>
</qti-assessment-item>`;

const endAttempt = `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    identifier="sample-end-attempt" title="End Attempt" adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
    <qti-correct-response>
      <qti-value>choice_b</qti-value>
    </qti-correct-response>
  </qti-response-declaration>
  <qti-response-declaration identifier="SKIP" cardinality="single" base-type="boolean">
    <qti-default-value><qti-value>false</qti-value></qti-default-value>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
    <qti-default-value><qti-value>0</qti-value></qti-default-value>
  </qti-outcome-declaration>
  <qti-item-body>
    <qti-choice-interaction response-identifier="RESPONSE" shuffle="false" max-choices="1">
      <qti-prompt>Which planet is known as the Red Planet?</qti-prompt>
      <qti-simple-choice identifier="choice_a">Venus</qti-simple-choice>
      <qti-simple-choice identifier="choice_b">Mars</qti-simple-choice>
      <qti-simple-choice identifier="choice_c">Jupiter</qti-simple-choice>
    </qti-choice-interaction>
    <qti-end-attempt-interaction response-identifier="SKIP" title="Skip this question"/>
  </qti-item-body>
  <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"/>
</qti-assessment-item>`;

// The 4 below need real images/media — reused directly from the official
// IMS QTI3 BPIG example package (qti-examples/QTI3_BPIG_Examples), copied
// into public/qti-assets/, since hand-writing pixel coordinates against a
// made-up image would be meaningless. Coordinates/structure here match
// those examples exactly; only the asset src paths were changed.
const hotspot = `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    identifier="sample-hotspot" title="Hotspot" adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
    <qti-correct-response>
      <qti-value>H</qti-value>
    </qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"/>
  <qti-item-body>
    <p>The picture illustrates four of the most popular lighthouses on outer Cape Cod, Massachusetts.</p>
    <qti-hotspot-interaction response-identifier="RESPONSE" max-choices="1">
      <qti-prompt>Which one is Highland Lighthouse?</qti-prompt>
      <img src="/qti-assets/map_cape_cod.svg" width="700" height="550"
       alt="a map of Cape Cod Massachusetts with 4 lighthouse icons distributed on the outer Cape" />
      <qti-hotspot-choice identifier="R" shape="circle" coords="418,29,40" />
      <qti-hotspot-choice identifier="H" shape="circle" coords="546,56,40" />
      <qti-hotspot-choice identifier="N" shape="circle" coords="596,182,40" />
      <qti-hotspot-choice identifier="C" shape="circle" coords="598,316,40" />
    </qti-hotspot-interaction>
  </qti-item-body>
  <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"/>
</qti-assessment-item>`;

const selectPoint = `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    identifier="sample-select-point" title="Select Point" adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="point">
    <qti-correct-response>
      <qti-value>93 111</qti-value>
    </qti-correct-response>
    <qti-area-mapping default-value="0">
      <qti-area-map-entry shape="circle" coords="93,111,16" mapped-value="1"/>
    </qti-area-mapping>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"/>
  <qti-item-body>
    <qti-select-point-interaction max-choices="1" response-identifier="RESPONSE">
      <qti-prompt>
        <p>Mark Edinburgh on this map of the United Kingdom.</p>
      </qti-prompt>
      <img width="196" height="280" src="/qti-assets/uk_green.png" alt="A map of the United Kingdom" />
    </qti-select-point-interaction>
  </qti-item-body>
  <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/map_response_point"/>
</qti-assessment-item>`;

const graphicGapMatch = `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    identifier="sample-graphic-gap-match" title="Graphic Gap Match" adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="directedPair">
    <qti-correct-response>
      <qti-value>GLA A</qti-value>
      <qti-value>EDI B</qti-value>
      <qti-value>MAN C</qti-value>
    </qti-correct-response>
    <qti-mapping default-value="-1" lower-bound="0">
      <qti-map-entry map-key="GLA A" mapped-value="1"/>
      <qti-map-entry map-key="EDI B" mapped-value="1"/>
      <qti-map-entry map-key="MAN C" mapped-value="1"/>
    </qti-mapping>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"/>
  <qti-item-body>
    <p>Some of the labels on this diagram are missing — identify the correct airport codes.</p>
    <qti-graphic-gap-match-interaction max-associations="0" response-identifier="RESPONSE">
      <qti-prompt>
        <p>Drag each code onto its airport.</p>
      </qti-prompt>
      <img src="/qti-assets/ukairtags2024.png" width="305" height="390" alt="Outline map of the United Kingdom" />
      <qti-gap-img identifier="CBG" match-max="1">
        <img src="/qti-assets/cbg.png" width="53" height="29" alt="The initials CBG" />
      </qti-gap-img>
      <qti-gap-img identifier="EBG" match-max="1">
        <img src="/qti-assets/ebg.png" width="53" height="29" alt="The initials EBG" />
      </qti-gap-img>
      <qti-gap-img identifier="EDI" match-max="1">
        <img src="/qti-assets/edi.png" width="53" height="29" alt="The initials EDI" />
      </qti-gap-img>
      <qti-gap-img identifier="GLA" match-max="1">
        <img src="/qti-assets/gla.png" width="53" height="29" alt="The initials GLA" />
      </qti-gap-img>
      <qti-gap-img identifier="MAN" match-max="1">
        <img src="/qti-assets/man.png" width="53" height="29" alt="The initials MAN" />
      </qti-gap-img>
      <qti-gap-img identifier="MCH" match-max="1">
        <img src="/qti-assets/mch.png" width="53" height="29" alt="The initials MCH" />
      </qti-gap-img>
      <qti-associable-hotspot identifier="A" match-max="1" shape="rect" coords="11,122,64,151" />
      <qti-associable-hotspot identifier="B" match-max="1" shape="rect" coords="187,105,240,134" />
      <qti-associable-hotspot identifier="C" match-max="1" shape="rect" coords="91,206,144,235" />
    </qti-graphic-gap-match-interaction>
  </qti-item-body>
  <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/map_response"/>
</qti-assessment-item>`;

const media = `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    identifier="sample-media" title="Media" adaptive="false" time-dependent="false">
  <qti-response-declaration base-type="integer" cardinality="single" identifier="RESPONSE_1"/>
  <qti-item-body>
    <qti-media-interaction autostart="false" loop="false" response-identifier="RESPONSE_1" max-plays="3">
      <qti-prompt>Play this video.</qti-prompt>
      <video width="320" height="240">
        <source src="/qti-assets/bubble.mp4" type="video/mp4"/>
        <source src="/qti-assets/bubble.ogv" type="video/ogv"/>
      </video>
    </qti-media-interaction>
  </qti-item-body>
</qti-assessment-item>`;

// Exercises the docked-stimulus layout: the item author places a docking
// div (data-stimulus-idref) inside their own two-column qti-layout-row,
// expecting the stimulus rendered exactly there rather than in a host panel.
const choiceDocked = `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    identifier="sample-choice-docked" title="Docked Stimulus" adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
    <qti-correct-response>
      <qti-value>choice_a</qti-value>
    </qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
    <qti-default-value><qti-value>0</qti-value></qti-default-value>
  </qti-outcome-declaration>
  <qti-assessment-stimulus-ref identifier="sample-stimulus" href="/qti-assets/sample-stimulus.xml" title="The Red Planet" />
  <qti-item-body>
    <div class="qti-layout-row">
      <div class="qti-layout-col6">
        <div class="qti-shared-stimulus" data-stimulus-idref="sample-stimulus"></div>
      </div>
      <div class="qti-layout-col6">
        <qti-choice-interaction response-identifier="RESPONSE" shuffle="false" max-choices="1">
          <qti-prompt>Based on the passage, why does Mars appear red?</qti-prompt>
          <qti-simple-choice identifier="choice_a">Iron oxide on its surface</qti-simple-choice>
          <qti-simple-choice identifier="choice_b">Its distance from the Sun</qti-simple-choice>
          <qti-simple-choice identifier="choice_c">Its thick atmosphere</qti-simple-choice>
        </qti-choice-interaction>
      </div>
    </div>
  </qti-item-body>
  <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"/>
</qti-assessment-item>`;

const montyHall = `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
  identifier="sample-monty-hall" title="Monty Hall (Take 2)"
  adaptive="true" time-dependent="false" xml:lang="en" >

  <qti-response-declaration identifier="DOOR" cardinality="single" base-type="identifier" />
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
    <qti-correct-response>
      <qti-value>switchStrategy</qti-value>
    </qti-correct-response>
  </qti-response-declaration>

  <qti-outcome-declaration identifier="STORY" cardinality="single" base-type="identifier">
    <qti-default-value>
      <qti-value>openingGambit</qti-value>
    </qti-default-value>
  </qti-outcome-declaration>
  <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier" />
  <qti-outcome-declaration identifier="CLOSED" cardinality="multiple" base-type="identifier">
    <qti-default-value>
      <qti-value>DoorA</qti-value>
      <qti-value>DoorB</qti-value>
      <qti-value>DoorC</qti-value>
    </qti-default-value>
  </qti-outcome-declaration>
  <qti-outcome-declaration identifier="GOATS" cardinality="multiple" base-type="identifier" />
  <qti-outcome-declaration identifier="PRIZE" cardinality="single" base-type="identifier" />
  <qti-outcome-declaration identifier="FIRSTDOOR" cardinality="single" base-type="identifier" />
  <qti-outcome-declaration identifier="REVEALED" cardinality="single" base-type="identifier" />
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float" />

  <qti-template-declaration identifier="PRIZEDOOR" cardinality="single" base-type="identifier"
    math-variable="false" param-variable="false" />
  <qti-template-processing>
    <qti-set-template-value identifier="PRIZEDOOR">
      <qti-random>
        <qti-multiple>
          <qti-base-value base-type="identifier">DoorA</qti-base-value>
          <qti-base-value base-type="identifier">DoorB</qti-base-value>
          <qti-base-value base-type="identifier">DoorC</qti-base-value>
        </qti-multiple>
      </qti-random>
    </qti-set-template-value>
  </qti-template-processing>

  <qti-item-body>
    <p>Monty Hall has hidden a prize behind one of these doors.</p>
    <qti-feedback-block outcome-identifier="STORY" show-hide="show" identifier="openingGambit">
      <qti-content-body>
        <p>Monty invites you to choose one of the doors but won't let you open it just yet.</p>
      </qti-content-body>
    </qti-feedback-block>
    <qti-feedback-block outcome-identifier="STORY" show-hide="show" identifier="tempter">
      <qti-content-body>
        <p>Monty opens one of the other doors to reveal - a goat!</p>
        <p>He then asks you if you would like to change your mind or to stick with the door
          you originally chose. It's time to make your mind up, which door are you going to
          open?</p>
      </qti-content-body>
    </qti-feedback-block>
    <qti-feedback-block outcome-identifier="STORY" show-hide="show" identifier="goat">
      <qti-content-body>
        <p>Bad luck! When you opened your chosen door it also revealed a goat.</p>
      </qti-content-body>
    </qti-feedback-block>
    <qti-feedback-block outcome-identifier="STORY" show-hide="show" identifier="prize">
      <qti-content-body>
        <p>Congratulations! When you opened your chosen door it revealed a fantastic prize
          that you are now free to take home.</p>
      </qti-content-body>
    </qti-feedback-block>
    <qti-choice-interaction response-identifier="DOOR" shuffle="false" max-choices="1">
      <qti-simple-choice identifier="DoorA">
        <qti-feedback-inline outcome-identifier="CLOSED" show-hide="show" identifier="DoorA">
          <span>[Red Door]</span>
        </qti-feedback-inline>
        <qti-feedback-inline outcome-identifier="GOATS" show-hide="show" identifier="DoorA">
          <span>[Open Door]</span> - this door is now open revealing a goat!</qti-feedback-inline>
        <qti-feedback-inline outcome-identifier="PRIZE" show-hide="show" identifier="DoorA">
          <span>[Open Door]</span> - this door is now open revealing a fantastic prize!</qti-feedback-inline>
      </qti-simple-choice>
      <qti-simple-choice identifier="DoorB">
        <qti-feedback-inline outcome-identifier="CLOSED" show-hide="show" identifier="DoorB">
          <span>[Green Door]</span>
        </qti-feedback-inline>
        <qti-feedback-inline outcome-identifier="GOATS" show-hide="show" identifier="DoorB">
          <span>[Open Door]</span> - this door is now open revealing a goat!</qti-feedback-inline>
        <qti-feedback-inline outcome-identifier="PRIZE" show-hide="show" identifier="DoorB">
          <span>[Open Door]</span> - this door is now open revealing a fantastic prize!</qti-feedback-inline>
      </qti-simple-choice>
      <qti-simple-choice identifier="DoorC">
        <qti-feedback-inline outcome-identifier="CLOSED" show-hide="show" identifier="DoorC">
          <span>[Blue Door]</span>
        </qti-feedback-inline>
        <qti-feedback-inline outcome-identifier="GOATS" show-hide="show" identifier="DoorC">
          <span>[Open Door]</span> - this door is now open revealing a goat!</qti-feedback-inline>
        <qti-feedback-inline outcome-identifier="PRIZE" show-hide="show" identifier="DoorC">
          <span>[Open Door]</span> - this door is now open revealing a fantastic prize!</qti-feedback-inline>
      </qti-simple-choice>
    </qti-choice-interaction>
    <qti-feedback-block outcome-identifier="FEEDBACK" show-hide="show" identifier="poser">
      <qti-content-body>
        <p>Well, whether or not you won the prize did you make your decision by guesswork or
          logical reasoning? The question is, if we allowed you to play this game
          repeatedly what strategy <em>should</em> you adopt?</p>
        <qti-choice-interaction response-identifier="RESPONSE" shuffle="true"
          max-choices="1">
          <qti-simple-choice identifier="stickStrategy">Always stick to the first door you
            chose.</qti-simple-choice>
          <qti-simple-choice identifier="switchStrategy">Always switch to the other closed
            door when Monty offers you the chance.</qti-simple-choice>
          <qti-simple-choice identifier="noStrategy">It really doesn't matter whether you
            stick or switch - the outcome's the same.</qti-simple-choice>
        </qti-choice-interaction>
      </qti-content-body>
    </qti-feedback-block>
  </qti-item-body>

  <qti-response-processing>
    <qti-set-outcome-value identifier="completionStatus">
      <qti-base-value base-type="identifier">incomplete</qti-base-value>
    </qti-set-outcome-value>
    <qti-response-condition>
      <qti-response-if>
        <!-- Transition from openingGambit to tempter -->
        <qti-and>
          <qti-match>
            <qti-base-value base-type="identifier">openingGambit</qti-base-value>
            <qti-variable identifier="STORY" />
          </qti-match>
          <qti-not>
            <qti-is-null>
              <qti-variable identifier="DOOR" />
            </qti-is-null>
          </qti-not>
        </qti-and>
        <!-- Remember the first door chosen -->
        <qti-set-outcome-value identifier="FIRSTDOOR">
          <qti-variable identifier="DOOR" />
        </qti-set-outcome-value>
        <qti-response-condition>
          <qti-response-if>
            <qti-match>
              <qti-variable identifier="DOOR" />
              <qti-variable identifier="PRIZEDOOR" />
            </qti-match>
            <!-- Randomly open one of the other two doors -->
            <qti-response-condition>
              <qti-response-if>
                <qti-match>
                  <qti-variable identifier="DOOR" />
                  <qti-base-value base-type="identifier">DoorA</qti-base-value>
                </qti-match>
                <qti-set-outcome-value identifier="REVEALED">
                  <qti-random>
                    <qti-multiple>
                      <qti-base-value base-type="identifier">DoorB</qti-base-value>
                      <qti-base-value base-type="identifier">DoorC</qti-base-value>
                    </qti-multiple>
                  </qti-random>
                </qti-set-outcome-value>
              </qti-response-if>
              <qti-response-else-if>
                <qti-match>
                  <qti-variable identifier="DOOR" />
                  <qti-base-value base-type="identifier">DoorB</qti-base-value>
                </qti-match>
                <qti-set-outcome-value identifier="REVEALED">
                  <qti-random>
                    <qti-multiple>
                      <qti-base-value base-type="identifier">DoorA</qti-base-value>
                      <qti-base-value base-type="identifier">DoorC</qti-base-value>
                    </qti-multiple>
                  </qti-random>
                </qti-set-outcome-value>
              </qti-response-else-if>
              <qti-response-else>
                <qti-set-outcome-value identifier="REVEALED">
                  <qti-random>
                    <qti-multiple>
                      <qti-base-value base-type="identifier">DoorA</qti-base-value>
                      <qti-base-value base-type="identifier">DoorB</qti-base-value>
                    </qti-multiple>
                  </qti-random>
                </qti-set-outcome-value>
              </qti-response-else>
            </qti-response-condition>
          </qti-response-if>
          <qti-response-else>
            <!-- Open the other losing door -->
            <qti-response-condition>
              <qti-response-if>
                <qti-not>
                  <qti-member>
                    <qti-base-value base-type="identifier">DoorA</qti-base-value>
                    <qti-multiple>
                      <qti-variable identifier="PRIZEDOOR" />
                      <qti-variable identifier="DOOR" />
                    </qti-multiple>
                  </qti-member>
                </qti-not>
                <qti-set-outcome-value identifier="REVEALED">
                  <qti-base-value base-type="identifier">DoorA</qti-base-value>
                </qti-set-outcome-value>
              </qti-response-if>
              <qti-response-else-if>
                <qti-not>
                  <qti-member>
                    <qti-base-value base-type="identifier">DoorB</qti-base-value>
                    <qti-multiple>
                      <qti-variable identifier="PRIZEDOOR" />
                      <qti-variable identifier="DOOR" />
                    </qti-multiple>
                  </qti-member>
                </qti-not>
                <qti-set-outcome-value identifier="REVEALED">
                  <qti-base-value base-type="identifier">DoorB</qti-base-value>
                </qti-set-outcome-value>
              </qti-response-else-if>
              <qti-response-else>
                <qti-set-outcome-value identifier="REVEALED">
                  <qti-base-value base-type="identifier">DoorC</qti-base-value>
                </qti-set-outcome-value>
              </qti-response-else>
            </qti-response-condition>
          </qti-response-else>
        </qti-response-condition>
        <qti-set-outcome-value identifier="CLOSED">
          <qti-delete>
            <qti-variable identifier="REVEALED" />
            <qti-variable identifier="CLOSED" />
          </qti-delete>
        </qti-set-outcome-value>
        <qti-set-outcome-value identifier="GOATS">
          <qti-multiple>
            <qti-variable identifier="REVEALED" />
          </qti-multiple>
        </qti-set-outcome-value>
        <qti-set-outcome-value identifier="STORY">
          <qti-base-value base-type="identifier">tempter</qti-base-value>
        </qti-set-outcome-value>
      </qti-response-if>
      <qti-response-else-if>
        <!-- Transition from tempter to prize or goat -->
        <qti-and>
          <qti-match>
            <qti-base-value base-type="identifier">tempter</qti-base-value>
            <qti-variable identifier="STORY" />
          </qti-match>
          <qti-not>
            <qti-is-null>
              <qti-variable identifier="DOOR" />
            </qti-is-null>
          </qti-not>
        </qti-and>
        <!-- Whether you won or not, we score based on whether you switched -->
        <qti-response-condition>
          <qti-response-if>
            <qti-match>
              <qti-variable identifier="DOOR" />
              <qti-variable identifier="FIRSTDOOR" />
            </qti-match>
            <qti-set-outcome-value identifier="SCORE">
              <qti-base-value base-type="float">0</qti-base-value>
            </qti-set-outcome-value>
          </qti-response-if>
          <qti-response-else>
            <qti-set-outcome-value identifier="SCORE">
              <qti-base-value base-type="float">1</qti-base-value>
            </qti-set-outcome-value>
          </qti-response-else>
        </qti-response-condition>
        <!-- Now determine if you won the prize and open your chosen door -->
        <qti-response-condition>
          <qti-response-if>
            <qti-match>
              <qti-variable identifier="DOOR" />
              <qti-variable identifier="PRIZEDOOR" />
            </qti-match>
            <qti-set-outcome-value identifier="PRIZE">
              <qti-variable identifier="DOOR" />
            </qti-set-outcome-value>
            <qti-set-outcome-value identifier="STORY">
              <qti-base-value base-type="identifier">prize</qti-base-value>
            </qti-set-outcome-value>
          </qti-response-if>
          <qti-response-else>
            <qti-set-outcome-value identifier="GOATS">
              <qti-multiple>
                <qti-variable identifier="GOATS" />
                <qti-variable identifier="DOOR" />
              </qti-multiple>
            </qti-set-outcome-value>
            <qti-set-outcome-value identifier="STORY">
              <qti-base-value base-type="identifier">goat</qti-base-value>
            </qti-set-outcome-value>
          </qti-response-else>
        </qti-response-condition>
        <qti-set-outcome-value identifier="CLOSED">
          <qti-delete>
            <qti-variable identifier="DOOR" />
            <qti-variable identifier="CLOSED" />
          </qti-delete>
        </qti-set-outcome-value>
        <qti-set-outcome-value identifier="FEEDBACK">
          <qti-base-value base-type="identifier">poser</qti-base-value>
        </qti-set-outcome-value>
      </qti-response-else-if>
      <qti-response-else-if>
        <qti-and>
          <qti-match>
            <qti-variable identifier="FEEDBACK" />
            <qti-base-value base-type="identifier">poser</qti-base-value>
          </qti-match>
          <qti-not>
            <qti-is-null>
              <qti-variable identifier="RESPONSE" />
            </qti-is-null>
          </qti-not>
        </qti-and>
        <qti-response-condition>
          <qti-response-if>
            <qti-match>
              <qti-variable identifier="RESPONSE" />
              <qti-correct identifier="RESPONSE" />
            </qti-match>
            <qti-set-outcome-value identifier="SCORE">
              <qti-sum>
                <qti-variable identifier="SCORE" />
                <qti-base-value base-type="float">2</qti-base-value>
              </qti-sum>
            </qti-set-outcome-value>
          </qti-response-if>
        </qti-response-condition>
        <qti-set-outcome-value identifier="FEEDBACK">
          <qti-variable identifier="RESPONSE" />
        </qti-set-outcome-value>
        <qti-set-outcome-value identifier="completionStatus">
          <qti-base-value base-type="identifier">completed</qti-base-value>
        </qti-set-outcome-value>
      </qti-response-else-if>
    </qti-response-condition>
  </qti-response-processing>

  <qti-modal-feedback outcome-identifier="FEEDBACK" show-hide="show" identifier="stickStrategy">
    <qti-content-body>No. Initially, the probability of the prize being behind each door is 1/3.
      Opening a losing door can't possibly make this go down for the remaining closed one! In
      fact you should <em>never</em> stick to your original decision.
    </qti-content-body>
  </qti-modal-feedback>
  <qti-modal-feedback outcome-identifier="FEEDBACK" show-hide="show" identifier="switchStrategy">
    <qti-content-body>Yes, you should <em>always</em> switch doors when offered the chance.
      Congratulations, perhaps you should think about a career as a TV game show contestant?
    </qti-content-body>
  </qti-modal-feedback>
  <qti-modal-feedback outcome-identifier="FEEDBACK" show-hide="show" identifier="noStrategy">
    <qti-content-body>
      <p>No, you should infact <em>always</em> switch doors. This problem has fooled many
        mathematicians since it was first posed in an American magazine article and
        continues to present a seemingly paradoxical answer!</p>
      <p>The probability of your first choice door hiding the prize is 1/3 and this can't change.
        But, 2/3 of the time you'll be wrong with your first choice and, by revealing a goat,
        Monty is effectively telling you which door the prize is behind the remaining 2/3 of the
        time! So by switching doors, your chances of getting the prize go up to 2/3!</p>
    </qti-content-body>
  </qti-modal-feedback>

</qti-assessment-item>`;

const sampleItems: TestItem[] = [
  { identifier: 'sample-choice', guid: 'guid-choice', xml: choice, interactionType: 'Multiple Choice', stimulusRefs: ['sample-stimulus'] },
  { identifier: 'sample-choice-docked', guid: 'guid-choice-docked', xml: choiceDocked, interactionType: 'Multiple Choice', stimulusRefs: ['sample-stimulus'] },
  { identifier: 'sample-order', guid: 'guid-order', xml: order, interactionType: 'Order' },
  { identifier: 'sample-match', guid: 'guid-match', xml: match, interactionType: 'Match' },
  { identifier: 'sample-gap-match', guid: 'guid-gap-match', xml: gapMatch, interactionType: 'Gap Match' },
  { identifier: 'sample-hottext', guid: 'guid-hottext', xml: hottext, interactionType: 'Hottext' },
  { identifier: 'sample-inline-choice', guid: 'guid-inline-choice', xml: inlineChoice, interactionType: 'Inline Choice' },
  { identifier: 'sample-text-entry', guid: 'guid-text-entry', xml: textEntry, interactionType: 'Text Entry' },
  { identifier: 'sample-extended-text', guid: 'guid-extended-text', xml: extendedText, interactionType: 'Extended Text' },
  { identifier: 'sample-end-attempt', guid: 'guid-end-attempt', xml: endAttempt, interactionType: 'End Attempt' },
  { identifier: 'sample-hotspot', guid: 'guid-hotspot', xml: hotspot, interactionType: 'Hotspot' },
  { identifier: 'sample-select-point', guid: 'guid-select-point', xml: selectPoint, interactionType: 'Select Point' },
  { identifier: 'sample-graphic-gap-match', guid: 'guid-graphic-gap-match', xml: graphicGapMatch, interactionType: 'Graphic Gap Match' },
  { identifier: 'sample-media', guid: 'guid-media', xml: media, interactionType: 'Media' },
  {
    identifier: 'sample-monty-hall',
    guid: 'guid-monty-hall',
    xml: montyHall,
    interactionType: 'Monty Hall',
    sessionControl: { submissionMode: 'individual' },
  },
];

export default sampleItems;
