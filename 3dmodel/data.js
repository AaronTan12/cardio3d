/**
 * Anatomical and Physiological Data for 3D Heart Model Presentation
 * Arranged sequentially by the logical flow of blood.
 */

const heartPartsData = {
    // =================================================================
    // PHASE 1: THE RIGHT SIDE (Deoxygenated / Blue Loop)
    // =================================================================
    vena_cava: {
        name: "Vena Cava",
        pronunciation: "/vee-nuh key-vuh/",
        description: "The largest veins in the body. They act as the main return pipes for used blood.",
        function: "Brings all the used, oxygen-poor blood from the body back to the right atrium.",
        clinical: "Chest tumors can compress these veins, causing upper body swelling.",
        oxygenated: false
    },
    right_atrium: {
        name: "Right Atrium",
        pronunciation: "/rahyt ey-tree-uhm/",
        description: "The top right room of the heart. It collects used, oxygen-poor blood from the Vena Cava.",
        function: "Pumps blood down into the Right Ventricle.",
        clinical: "Irregular heartbeats (like Atrial Fibrillation) often originate here.",
        oxygenated: false
    },
    tricuspid_valve: {
        name: "Tricuspid Valve",
        pronunciation: "/trahy-kuhs-pid valv/",
        description: "A three-flap door located between the right atrium and right ventricle.",
        function: "Opens to let blood down into the ventricle, then seals tightly to prevent backflow.",
        clinical: "If it leaks, blood can pool back into the body, causing swollen legs.",
        oxygenated: false
    },
    right_ventricle: {
        name: "Right Ventricle",
        pronunciation: "/rahyt ven-tri-kuhl/",
        description: "The bottom right room. It has thinner muscular walls because it only pumps a short distance.",
        function: "Pumps used blood out toward the lungs to receive fresh oxygen.",
        clinical: "Can stretch and weaken if blood pressure in the lungs is chronically too high.",
        oxygenated: false
    },
    pulmonary_valve: {
        name: "Pulmonary Valve",
        pronunciation: "/puhl-muh-ner-ee valv/",
        description: "The exit door leading out from the right ventricle.",
        function: "Opens to let deoxygenated blood flow into the pulmonary artery, then snaps shut.",
        clinical: "Often surgically repaired in children if it doesn't form correctly at birth.",
        oxygenated: false
    },
    pulmonary_artery: {
        name: "Pulmonary Artery",
        pronunciation: "/puhl-muh-ner-ee ahr-tuh-ree/",
        description: "The large branching vessel routing blood away from the right ventricle.",
        function: "Carries oxygen-poor blood safely to the lungs to trade carbon dioxide for fresh oxygen.",
        clinical: "Sudden blockages here by travelling blood clots cause a life-threatening Pulmonary Embolism.",
        oxygenated: false
    },

    // =================================================================
    // PHASE 2: THE LEFT SIDE (Oxygenated / Red Loop)
    // =================================================================
    pulmonary_veins: {
        name: "Pulmonary Veins",
        pronunciation: "/puhl-muh-ner-ee veynz/",
        description: "The vessels returning blood back into the heart from the respiratory system.",
        function: "Carry freshly oxygenated, bright red blood from the lungs directly into the left atrium.",
        clinical: "Narrowing (stenosis) of these veins can trigger severe pulmonary hypertension.",
        oxygenated: true
    },
    left_atrium: {
        name: "Left Atrium",
        pronunciation: "/left ey-tree-uhm/",
        description: "The top left room of the heart. It acts as a staging area for freshly oxygenated blood.",
        function: "Pumps fresh blood down into the Left Ventricle.",
        clinical: "Valve structural issues here can cause blood fluid to back up dangerously into the lungs.",
        oxygenated: true
    },
    bicuspid_valve: {
        name: "Mitral (Bicuspid) Valve",
        pronunciation: "/bahy-kuhs-pid valv/",
        description: "A secure, two-flap door between the left atrium and left ventricle.",
        function: "Seals tightly so blood doesn't shoot backward into the lungs during a massive contraction.",
        clinical: "A very common clinical issue is when these flaps bulge backward, known as Mitral Valve Prolapse.",
        oxygenated: true
    },
    left_ventricle: {
        name: "Left Ventricle",
        pronunciation: "/left ven-tri-kuhl/",
        description: "The biggest, thickest, and strongest room in the entire heart.",
        function: "Powerfully contracts to shoot oxygen-rich blood out to every organ in the body.",
        clinical: "This heavy-lifting muscle is the primary area permanently damaged during a heart attack.",
        oxygenated: true
    },
    aortic_valve: {
        name: "Aortic Valve",
        pronunciation: "/ey-awr-tik valv/",
        description: "The primary exit door leading out from the powerful left ventricle.",
        function: "Opens to release fresh blood into the Aorta, closing instantly to maintain pressure.",
        clinical: "Can become stiff or calcified with age, forcing the heart to work twice as hard to pump.",
        oxygenated: true
    },
    aorta: {
        name: "Aorta",
        pronunciation: "/ey-awr-tuh/",
        description: "The main, largest, and highest-pressure artery in the human body.",
        function: "Distributes the fresh, oxygen-rich blood down from the heart out to the systemic system.",
        clinical: "Uncontrolled high blood pressure can cause this massive vessel to balloon out or tear (Aneurysm).",
        oxygenated: true
    },

    // =================================================================
    // PHASE 3: INTERNAL STRUCTURES (Deep-Dive Details)
    // =================================================================
    interatrial_septum: {
        name: "Interatrial Septum",
        pronunciation: "/in-ter-ey-tree-uhl sep-tuhm/",
        description: "The internal muscular wall separating the right and left atria.",
        function: "Prevents deoxygenated blood and oxygenated blood from mixing in the upper chambers.",
        clinical: "Some infants are born with a hole here, clinically termed an Atrial Septal Defect (ASD).",
        oxygenated: false
    },
    interventricular_septum: {
        name: "Interventricular Septum",
        pronunciation: "/in-ter-ven-tri-kyuh-ler sep-tuhm/",
        description: "The thick central barrier dividing the right and left ventricles.",
        function: "Provides structural stability during contractions and keeps the two loops separated.",
        clinical: "A hole here (Ventricular Septal Defect) disrupts blood pressure balance entirely.",
        oxygenated: false
    },
    chordae_tendineae: {
        name: "Chordae Tendineae",
        pronunciation: "/kawr-dee ten-din-ee-ee/",
        description: "Strong, fibrous strings attached directly to the heart valves, resembling parachute lines.",
        function: "Holds the Tricuspid and Mitral valves stable so they don't prolapse under intense pumping pressure.",
        clinical: "Can snap due to bacterial infections or trauma, resulting in sudden, severe valve leaks.",
        oxygenated: false
    },
    papillary_muscles: {
        name: "Papillary Muscles",
        pronunciation: "/pap-uh-ler-ee muhl-suhlz/",
        description: "Muscular pillars growing directly out from the internal ventricular walls.",
        function: "Act as steady anchors that pull tightly on the Chordae Tendineae right before the heart squeezes.",
        clinical: "If these muscles lose blood supply during a heart attack, the attached valves fail immediately.",
        oxygenated: false
    },
    trabeculae_carneae: {
        name: "Trabeculae Carneae",
        pronunciation: "/truh-bek-yuh-lee kahr-nee-ee/",
        description: "A dense, sponge-like network of muscular ridges coating the inside of the ventricles.",
        function: "Prevents a suction effect within the empty chambers, ensuring blood flows cleanly and smoothly.",
        clinical: "Can thicken abnormally in patients suffering from long-term heart failure.",
        oxygenated: false
    }
};

const pathwayStepsData = [
    {
        id: "vena_cava",
        title: "1. Return from Body",
        description: "Used blood returns from the body tissues and enters the heart through the Vena Cava.",
        fact: "The Vena Cava deals with the lowest blood pressure in the entire cardiovascular loop.",
        circuit: "systemic"
    },
    {
        id: "right_atrium",
        title: "2. Receiving Room",
        description: "Blood waits inside the Right Atrium, which then contracts to pass it down to the next level.",
        fact: "The heart's natural electrical pacemaker (SA Node) is located right inside this chamber.",
        circuit: "pulmonary"
    },
    {
        id: "tricuspid_valve",
        title: "3. The First Gate",
        description: "Blood pushes through this three-flap door into the Right Ventricle.",
        fact: "The snappy closing sound of this valve contributes to the first 'lub' sound of your heartbeat.",
        circuit: "pulmonary"
    },
    {
        id: "right_ventricle",
        title: "4. Pumping to Lungs",
        description: "This chamber contracts to push the deoxygenated blood up through the pulmonary valve.",
        fact: "It does not need thick walls because the lungs are located directly next door to the heart.",
        circuit: "pulmonary"
    },
    {
        id: "pulmonary_artery",
        title: "5. To The Lungs",
        description: "Blood travels out through the Pulmonary Artery to reach the respiratory system.",
        fact: "This is the only artery in the entire human body that carries used, oxygen-poor blood.",
        circuit: "pulmonary"
    },
    {
        id: "pulmonary_veins",
        title: "6. Return of Fresh Blood",
        description: "Bright red, re-oxygenated blood returns out from the lungs through the Pulmonary Veins.",
        fact: "These are the only veins in the human body that carry fresh, highly oxygenated blood.",
        circuit: "systemic"
    },
    {
        id: "left_atrium",
        title: "7. Fresh Blood Intake",
        description: "Fresh blood pools inside the Left Atrium, getting ready to feed the rest of the body.",
        fact: "The wall of the left atrium is slightly smoother than that of the right atrium.",
        circuit: "systemic"
    },
    {
        id: "bicuspid_valve",
        title: "8. The Main Valve",
        description: "Blood is squeezed down through the Mitral (Bicuspid) Valve into the primary pumping station.",
        fact: "The Mitral Valve was named because its two flaps look exactly like a bishop's ceremonial hat (a mitre).",
        circuit: "systemic"
    },
    {
        id: "left_ventricle",
        title: "9. Power House Pumping",
        description: "This thick-walled room contracts forcefully, sending the fresh blood skyrocketing upward.",
        fact: "It possesses walls three times thicker than the right ventricle to generate enough force to reach your toes.",
        circuit: "systemic"
    },
    {
        id: "aorta",
        title: "10. The Highway Out",
        description: "Blood leaves via the Aortic Valve and races through the Aorta to drop off nutrients.",
        fact: "Blood shoots out of the left ventricle into the Aorta at an approximate speed of 3-4 miles per hour!",
        circuit: "systemic"
    }
];