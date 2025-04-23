class apiError extends Error{
    constructor(
        statusCode,
        message = "",
        errors = [],
        stack = ""
    ){
        super(message)
        this.statusCode = statusCode(message)
        this.data = null
        this.message = message
        this.success = false
        this.errors = errors

        if(stack){
            this.stack = stack
        }
        else{
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export {apiError}