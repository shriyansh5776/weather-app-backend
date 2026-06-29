import mongoose from "mongoose";
import uuid4 from 'uuid'

const preferencesSchema = new mongoose.Schema({
    user_id : {
        type : uuid4(),
        unique : true 
    },
    temperature_unit : {
        type : String,
        enum : ["celsius","fahrenheit"]
    },
    wind_speed_unit : {
        type : String,
        enum : ["kmh","mph","ms"]
    },
    precipitation_unit:{
        type: String,
        enum : ["mm","inch"]
    },
    pressure_unit:{
        type:String,
        enum : ["hpa","inhg"]
    },
    time_format :{
        type:String,
        enum : ["12h","24h"]
    },
    language:{
        type:String,
        minLength : 8 ,
        enum : ["12h","24h"]
    },
    theme:{
        type:String, 
        enum : ["system","dark","light"]
    },
    default_latitude:{
        type : Number,
        required : false
    },
    default_longitude:{
        type : Number,
        required : false
    },
},{timestamps:{
    updatedAt : "updated_at"
}})