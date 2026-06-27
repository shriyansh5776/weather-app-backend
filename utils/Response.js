const successResponse = (res,statusCode,message,data={})=>{
    return res.status(statusCode).json({
        success : true,
        message : message,
        ...data
    })
}
const errorResponse = (res,statusCode=500,message="Something went wrong",data={})=>{
    return res.status(statusCode).json({
        success : false,
        message : message,
        ...data
    })
}
export { successResponse,errorResponse}