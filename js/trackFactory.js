import FeatureTrack from "./feature/featureTrack.js";
import SequenceTrack from "./sequenceTrack.js";
import WigTrack from "./feature/wigTrack.js";
import SegTrack from "./feature/segTrack.js";
import MergedTrack from "./feature/mergedTrack.js";
import BAMTrack from "./bam/bamTrack.js";
import InteractionTrack from "./feature/interactionTrack.js";
import VariantTrack from "./variant/variantTrack.js";
import EqtlTrack from "./gtex/eqtlTrack.js";
import GWASTrack from "./gwas/gwasTrack.js";
import GCNVTrack from "./gcnv/gcnvTrack.js";
import RnaStructTrack from "./rna/rnaStruct.js";
import IdeogramTrack from "./ideogramTrack.js";
import IRFinderTrack from "./irfinder/irfinderTrack.js";
import IRratioTrack from "./irfinder/irratioTrack.js";
import iMOKATrack from "./imoka/imokaTrack.js";

const tracks = {
    'ideogram': (config, browser) => {
        return new IdeogramTrack(config, browser);
    },
    'sequence': (config, browser) => {
        return new SequenceTrack(config, browser);
    },
    'feature': (config, browser) => {
        return new FeatureTrack(config, browser);
    },
    'seg': (config, browser) => {
        return new SegTrack(config, browser);
    },
    'wig': (config, browser) => {
        return new WigTrack(config, browser);
    },
    'merged': (config, browser) => {
        return new MergedTrack(config, browser);
    },
    'alignment': (config, browser) => {
        return new BAMTrack(config, browser);
    },
	'irfinder' : ( config, browser) =>{
		return new IRFinderTrack(config, browser);
	},
	'irratio' : ( config, browser )=>{
			return new IRratioTrack(config, browser);
	},
	'imoka' : (config, browser)=>{
		return new iMOKATrack(config, browser);
	},
    'interaction': (config, browser) => {
        return new InteractionTrack(config, browser);
    },
    'interact': (config, browser) => {
        return new InteractionTrack(config, browser);
    },
    'variant': (config, browser) => {
        return new VariantTrack(config, browser);
    },
    'eqtl': (config, browser) => {
        return new EqtlTrack(config, browser);
    },
    'gwas': (config, browser) => {
        return new GWASTrack(config, browser);
    },
    'arc': (config, browser) => {
        return new RnaStructTrack(config, browser);
    },
    'gcnv': (config, browser) => {
        return new GCNVTrack(config, browser);
    }
}

const addTrack = function (name, track) {
    this.tracks[name] = track;
}

const getTrack = function (name) {
    return this.tracks[name];
}

export default {
    tracks,
    addTrack,
    getTrack
}
